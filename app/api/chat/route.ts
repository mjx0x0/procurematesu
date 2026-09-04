import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { retrieveDocumentChunks } from '@/lib/document-retrieval';
import { GoogleGenAI } from '@google/genai';

// ============================================================
// CONFIGURATION & DATABASE FALLBACKS
// ============================================================

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const isSupabaseConfigured = Boolean(
  rawUrl &&
  rawUrl.startsWith('http') &&
  !rawUrl.includes('placeholder') &&
  rawKey &&
  !rawKey.includes('placeholder')
);

const supabase = isSupabaseConfigured
  ? createClient(rawUrl!, rawKey!)
  : null;

// In-memory session and message cache for seamless state tracking
interface SessionState {
  drafting?: boolean;
  step?: 'purpose' | 'department' | 'items' | null;
  collected?: {
    purpose?: string;
    department?: string;
    items_raw?: string;
    extracted?: any;
  };
}

const inMemorySessions = new Map<string, { state: SessionState; messages: Array<{ sender: string; content: string; time: string }> }>();

// Seed PRs for tracking if Supabase is offline or not configured
const MOCK_PRS: Record<string, any> = {
  'PR-2026-0001': {
    pr_no: 'PR-2026-0001',
    purpose: 'IT Equipment and Desktop Workstations for Computer Science Laboratory',
    total: 485000,
    current_stage: 'po_issued',
    department: 'College of Science and Mathematics',
    section: 'Computer Science Department',
    pr_date: '2026-02-15',
    stages: [
      { stage_name: 'PR Preparation & Submission', completed_at: '2026-02-15T09:00:00.000Z' },
      { stage_name: 'Budget Office Certification', completed_at: '2026-02-16T14:30:00.000Z' },
      { stage_name: 'PMO Validation & Control', completed_at: '2026-02-18T10:15:00.000Z' },
      { stage_name: 'BAC Small Value Procurement Posting', completed_at: '2026-02-20T16:00:00.000Z' },
      { stage_name: 'Abstract of Quotations (AOQ)', completed_at: '2026-02-23T11:45:00.000Z' },
      { stage_name: 'Purchase Order (PO) Issued', completed_at: '2026-02-25T15:20:00.000Z' },
    ],
  },
  'PR-2026-0002': {
    pr_no: 'PR-2026-0002',
    purpose: 'Laboratory Reagents and Borosilicate Glassware for Chemistry Department',
    total: 178500,
    current_stage: 'budget_office',
    department: 'College of Natural Sciences',
    section: 'Chemistry Laboratory',
    pr_date: '2026-02-28',
    stages: [
      { stage_name: 'PR Preparation & Submission', completed_at: '2026-02-28T10:30:00.000Z' },
      { stage_name: 'Budget Office Certification (In Review)', completed_at: '2026-03-01T09:00:00.000Z' },
    ],
  },
  'PR-2026-0003': {
    pr_no: 'PR-2026-0003',
    purpose: 'Air Conditioning Units 2.5HP Inverter Split-Type for Graduate School Classrooms',
    total: 240000,
    current_stage: 'bidding',
    department: 'College of Education',
    section: 'Graduate School Office',
    pr_date: '2026-02-10',
    stages: [
      { stage_name: 'PR Preparation & Submission', completed_at: '2026-02-10T08:00:00.000Z' },
      { stage_name: 'Budget Office Certification', completed_at: '2026-02-11T13:00:00.000Z' },
      { stage_name: 'BAC Canvassing & RFQ Posting', completed_at: '2026-02-15T10:00:00.000Z' },
      { stage_name: 'Public Canvass / Bidding Stage', completed_at: '2026-02-22T14:00:00.000Z' },
    ],
  },
};

// ============================================================
// GEMINI API CALL WITH MULTI-MODEL RESILIENCE
// ============================================================

let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

async function callGeminiWithFallback(
  prompt: string,
  systemInstruction?: string,
  temperature: number = 0.2
): Promise<string> {
  const client = getGenAI();
  if (!client) {
    return '';
  }

  // Prioritize gemini-3.1-flash-lite for fastest speed and high availability, fallback to gemini-3.8-flash
  const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];

  for (const model of modelsToTry) {
    try {
      const generatePromise = client.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction,
          temperature,
          maxOutputTokens: 1200,
        },
      });

      // Allow up to 14 seconds before moving to fallback model or offline knowledge
      const timeoutPromise = new Promise<never>((_, reject) => {
        const id = setTimeout(() => {
          clearTimeout(id);
          reject(new Error('TIMEOUT'));
        }, 14000);
      });

      const response = await Promise.race([generatePromise, timeoutPromise]);
      const text = response?.text?.trim();
      if (text) {
        return text;
      }
    } catch (err: any) {
      if (err?.message !== 'TIMEOUT') {
        console.warn(`[Gemini API] Call to ${model} failed gracefully:`, err?.message?.slice(0, 120) || 'Unknown error');
      }
    }
  }

  return '';
}

// ============================================================
// ============================================================
// OFFLINE EXPERT KNOWLEDGE ENGINE (SAFETY NET)
// ============================================================

function generateOfflineProcurementResponse(query: string, retrievedContext: string, sources: string[] = []): string {
  const q = query.toLowerCase();

  // If we have verified context from document_chunks, prioritize summarizing it directly to prevent hallucinations
  if (retrievedContext && retrievedContext.length > 50) {
    const sourceList = sources.length > 0 ? sources.join(', ') : 'RA 12009 & MSU Procurement Manual';
    return (
      `🏛️ **Verified Guidance from University Procurement Documents (${sourceList})**\n\n` +
      `${retrievedContext.slice(0, 1000)}\n\n` +
      `---\n` +
      `*(Grounded in verified database records from \`document_chunks\`. For official endorsement, coordinate with the MSU-GenSan Procurement Management Office).*`
    );
  }

  if (q.includes('ra 12009') || q.includes('12009') || q.includes('new government procurement act')) {
    return (
      "🏛️ **Republic Act No. 12009 (New Government Procurement Act - NGPA)**\n\n" +
      "Republic Act No. 12009 was signed into law to modernize and revise RA 9184. It establishes a modernized, transparent, and sustainable public procurement framework across all government agencies and state universities, including **MSU-GenSan**.\n\n" +
      "**Key Pillars of RA 12009:**\n" +
      "1. **Strategic Procurement Planning**: Stronger linkage between Project Procurement Management Plans (PPMP), the Annual Procurement Plan (APP), and verified budget allocations.\n" +
      "2. **Transparency & Open Data**: Mandatory posting in PhilGEPS and agency procurement portals.\n" +
      "3. **Fit-for-Purpose Modalities**: Clearer parameters for Competitive Bidding (primary mode) and Alternative Methods.\n" +
      "4. **Green & Sustainable Procurement**: Whole-of-lifecycle evaluation prioritizing environmental sustainability and local value creation.\n" +
      "5. **Professionalization**: Standard qualification and continuous training for Bids and Awards Committees (BAC), TWGs, and Procurement Officers."
    );
  }

  if (q.includes('svp') || q.includes('small value') || q.includes('threshold')) {
    return (
      "📋 **Small Value Procurement (SVP) under RA 12009 & RA 9184**\n\n" +
      "Small Value Procurement is an Alternative Method of Procurement utilized for procurement of goods, infrastructure projects, and consulting services where the amount does not exceed the threshold prescribed in the procurement rules.\n\n" +
      "**Key Rules for MSU-GenSan:**\n" +
      "• **Approved Budget for the Contract (ABC)**: Must be within authorized institutional thresholds and included in the approved PPMP and APP.\n" +
      "• **Canvassing Requirements**: Request for Quotation (RFQ) must be sent to at least three (3) suppliers of known qualifications.\n" +
      "• **PhilGEPS Posting**: For transactions exceeding ₱50,000, posting in the PhilGEPS portal and MSU website for a minimum of three (3) calendar days is required.\n" +
      "• **Prohibition Against Splitting**: Splitting of government contracts into smaller amounts to avoid competitive bidding is strictly prohibited by law."
    );
  }

  if (q.includes('step') || q.includes('flow') || q.includes('process') || q.includes('procedure')) {
    return (
      "🔄 **MSU-GenSan Procurement Process Flow**\n\n" +
      "1. **Preparation & Submission**: The requesting department prepares the Purchase Request (PR) based on the approved PPMP.\n" +
      "2. **Budget Certification**: The Budget Office validates fund availability and issues the ALOBS/Certification.\n" +
      "3. **PMO Verification & Control**: The Procurement Management Office verifies specifications and assigns control numbers.\n" +
      "4. **BAC Resolution & Canvass**: The Bids and Awards Committee assigns the procurement mode (Bidding or SVP/Shopping) and releases Requests for Quotations (RFQs).\n" +
      "5. **Abstract of Quotation (AOQ)**: Supplier bids are opened, evaluated, and the Lowest Calculated and Responsive Bid is selected.\n" +
      "6. **Award & Purchase Order**: Notice of Award and Purchase Order (PO) are approved by the Chancellor / Head of Procuring Entity (HoPE).\n" +
      "7. **Delivery & Inspection**: Delivered items undergo inspection, acceptance, and accounting processing for payment."
    );
  }

  if (q.includes('hello') || q.includes('hi') || q.includes('hey') || q.includes('who are you')) {
    return (
      "👋 Kumusta! I am **Isko BidDo**, your official AI Procurement Assistant for Mindanao State University - General Santos.\n\n" +
      "I can help you with:\n" +
      "• **RA 12009 & RA 9184 rules**, legal principles, and procurement modes\n" +
      "• **Drafting Purchase Requests** step-by-step with instant print & form generation (try saying *'Help me draft a PR'*)\n" +
      "• **Tracking PR status** and timeline stages (e.g. *'Track PR-2026-0001'*)\n" +
      "• **Small Value Procurement (SVP)** thresholds and PhilGEPS requirements\n\n" +
      "How may I assist you today?"
    );
  }

  return (
    "Isko BidDo Assistant: In accordance with Republic Act No. 12009 (New Government Procurement Act) and the MSU-GenSan Procurement Manual, all university procurement must adhere to transparency, competitiveness, efficiency, and strict budget alignment (PPMP/APP).\n\n" +
    "You can ask me about:\n" +
    "• Specific procurement modes (Competitive Bidding, SVP, Shopping)\n" +
    "• How to draft a new Purchase Request (say *'Help me draft a PR'*)\n" +
    "• Tracking a current purchase request (say *'Track PR-2026-0001'*)"
  );
}

// ============================================================
// SMART PR PARSER & EXTRACTOR
// ============================================================

interface ExtractedPR {
  department: string | null;
  purpose: string | null;
  items: Array<{
    item_description: string;
    quantity: number;
    unit: string;
    unit_cost: number;
    total_cost: number;
  }>;
  total_amount: number;
}

async function extractPRDetails(text: string): Promise<ExtractedPR> {
  const extractionPrompt = `
You are an expert procurement assistant parsing purchase request details from user input.
Input: "${text}"

Extract:
1. department (e.g. "College of Science and Mathematics", or null if not specified)
2. purpose (brief summary of the purpose of procurement)
3. items: list of items with:
   - item_description: string
   - quantity: integer (minimum 1)
   - unit: string (e.g. "pcs", "units", "sets", "reams", "boxes")
   - unit_cost: number (estimated unit price in PHP)
   - total_cost: number (quantity * unit_cost)
4. total_amount: number (sum of total_cost of all items)

Return ONLY a valid JSON object in this exact shape, with no markdown, no comments, no extra text:
{
  "department": null,
  "purpose": null,
  "items": [],
  "total_amount": 0
}
`;

  try {
    const raw = await callGeminiWithFallback(extractionPrompt, 'Return only pure raw JSON.', 0.0);
    if (raw) {
      const clean = raw.replace(/```json/gi, '').replace(/```/gi, '').trim();
      const parsed = JSON.parse(clean);
      if (Array.isArray(parsed.items) && parsed.items.length > 0) {
        const sanitizedItems = parsed.items.map((i: any) => {
          const qty = Number(i.quantity) || 1;
          const cost = Number(i.unit_cost) || 0;
          return {
            item_description: String(i.item_description || 'General Supplies Item').trim(),
            quantity: qty,
            unit: String(i.unit || 'pcs').trim(),
            unit_cost: cost,
            total_cost: qty * cost,
          };
        });

        const total = sanitizedItems.reduce((acc: number, item: any) => acc + item.total_cost, 0);

        return {
          department: parsed.department ? String(parsed.department).trim() : null,
          purpose: parsed.purpose ? String(parsed.purpose).trim() : null,
          items: sanitizedItems,
          total_amount: total,
        };
      }
    }
  } catch (e) {
    console.warn('AI Extraction failed, using rule-based parser:', e);
  }

  return extractPRDetailsRuleBased(text);
}

function extractPRDetailsRuleBased(text: string): ExtractedPR {
  let department: string | null = null;
  const deptMatch = text.match(/(?:for|department:?|dept:?)\s*([A-Za-z\s]+?(?:College|Department|Office|Laboratory|Center|Unit)[A-Za-z\s]*)/i);
  if (deptMatch) {
    department = deptMatch[1].trim();
  }

  let purpose = text;
  const purposeMatch = text.match(/(?:purpose:?|for the procurement of|for|in order to)\s*([^.,;\n]+)/i);
  if (purposeMatch) {
    purpose = purposeMatch[1].trim();
  }

  const items: Array<any> = [];
  const lines = text.split(/[.,;\n]/).filter(l => l.trim().length > 3);

  for (const line of lines) {
    // Check for qty, description, and optional cost
    const match = line.match(/(\d+)\s*([a-zA-Z]+)?\s*([^@\d]+?)(?:(?:at|@|costing|cost)\s*(?:₱|PHP|Php)?\s*([\d,]+))?$/i);
    if (match) {
      const qty = parseInt(match[1], 10);
      const unit = match[2] && ['pcs', 'units', 'sets', 'reams', 'boxes', 'packs', 'rolls'].includes(match[2].toLowerCase())
        ? match[2].toLowerCase()
        : 'pcs';
      const desc = (match[3] || line).trim();
      const rawCost = match[4] ? match[4].replace(/,/g, '') : '0';
      const unitCost = parseFloat(rawCost) || 0;

      if (desc && desc.length > 2 && !desc.toLowerCase().startsWith('purpose') && !desc.toLowerCase().startsWith('department')) {
        items.push({
          item_description: desc,
          quantity: qty,
          unit,
          unit_cost: unitCost,
          total_cost: qty * unitCost,
        });
      }
    }
  }

  if (items.length === 0) {
    const qtyMatch = text.match(/\b(\d+)\b/);
    const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
    const costMatch = text.match(/(?:₱|PHP|Php)?\s*([\d,]+)(?:\.00)?/);
    const cost = costMatch ? parseFloat(costMatch[1].replace(/,/g, '')) || 0 : 0;

    items.push({
      item_description: text.trim().slice(0, 100),
      quantity: qty,
      unit: 'pcs',
      unit_cost: cost,
      total_cost: qty * cost,
    });
  }

  const total = items.reduce((sum, item) => sum + item.total_cost, 0);

  return {
    department,
    purpose,
    items,
    total_amount: total,
  };
}

// ============================================================
// STATUS & TRACKING HELPERS
// ============================================================

function getStageFriendlyName(stage: string): string {
  const map: Record<string, string> = {
    draft: 'Draft (Pending Submission)',
    pending: 'Submitted - Pending Verification',
    budget_office: 'Budget Office Certification',
    chancellor_approval: 'Chancellor / HoPE Approval',
    procurement_processing: 'Procurement Management Office Review',
    canvassing: 'Canvassing / RFQ Release',
    bidding: 'Public Bidding Stage',
    for_award: 'Notice of Award Preparation',
    po_issued: 'Purchase Order (PO) Issued',
    completed: 'Completed & Delivered',
    cancelled: 'Cancelled',
  };
  return map[stage] || stage.replace(/_/g, ' ').toUpperCase();
}

async function handleTrackPR(prNo: string): Promise<string> {
  const cleanPR = prNo.trim().toUpperCase();

  // 1. Try real Supabase if configured
  if (supabase) {
    try {
      const { data: pr } = await supabase
        .from('purchase_requests')
        .select('*, pr_stages_completed(*)')
        .ilike('pr_no', `%${cleanPR}%`)
        .single();

      if (pr) {
        let text = `📋 **Purchase Request Tracking: ${pr.pr_no}**\n\n`;
        text += `• **Current Status**: ${getStageFriendlyName(pr.current_stage)}\n`;
        text += `• **Department**: ${pr.department || 'N/A'}\n`;
        text += `• **Purpose**: ${pr.purpose || 'N/A'}\n`;
        text += `• **Approved Budget / Total**: ₱${(Number(pr.total) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}\n`;

        const stages = pr.pr_stages_completed || [];
        if (stages.length > 0) {
          text += `\n**Timeline Progress:**\n`;
          stages.forEach((s: any) => {
            const dateStr = s.completed_at ? new Date(s.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Completed';
            text += `✅ ${s.stage_name} — *${dateStr}*\n`;
          });
        }
        return text;
      }
    } catch (e) {
      console.warn('Database PR lookup error, falling back to mock records:', e);
    }
  }

  // 2. Fallback to mock PRs
  for (const [key, pr] of Object.entries(MOCK_PRS)) {
    if (cleanPR.includes(key) || key.includes(cleanPR) || cleanPR.includes(key.slice(-4))) {
      let text = `📋 **Purchase Request Tracking: ${pr.pr_no}**\n\n`;
      text += `• **Current Stage**: ${getStageFriendlyName(pr.current_stage)}\n`;
      text += `• **Department**: ${pr.department}\n`;
      text += `• **Section**: ${pr.section}\n`;
      text += `• **Purpose**: ${pr.purpose}\n`;
      text += `• **Total Amount**: ₱${pr.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n\n`;
      text += `**Timeline Progress:**\n`;
      pr.stages.forEach((s: any) => {
        const dateStr = new Date(s.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        text += `✅ ${s.stage_name} — *${dateStr}*\n`;
      });
      return text;
    }
  }

  return `🔍 I could not find a Purchase Request matching **${prNo}** in our database.\n\nPlease check the PR number (example formats: *PR-2026-0001* or *PR-2026-0002*). You can also view all your requests directly in the **Dashboard**.`;
}

// ============================================================
// MULTI-TURN PR DRAFTING HANDLER
// ============================================================

async function handleDraftPRFlow(
  message: string,
  state: SessionState
): Promise<{ response: string; newState: SessionState }> {
  let newState: SessionState = { ...state };
  const lower = message.toLowerCase().trim();

  // If not currently drafting, initiate
  if (!state.drafting) {
    // Check if the user already provided comprehensive details in the first prompt
    const hasItemsOrCosts = /\b(\d+)\s*(pcs|units|sets|laptops|computers|printers|chairs|tables|paper|reams)?\b/i.test(message) &&
      (message.includes('department') || message.includes('college') || message.includes('for') || /\b(\d{3,})\b/.test(message));

    if (hasItemsOrCosts && !lower.includes('help me draft a pr') && !lower.includes('create a pr')) {
      const extracted = await extractPRDetails(message);
      if (extracted.items && extracted.items.length > 0) {
        return buildDraftCompletionResponse(extracted, newState);
      }
    }

    newState.drafting = true;
    newState.step = 'purpose';
    newState.collected = {};

    return {
      response:
        "📝 **Let's draft a new Purchase Request (PR) together!**\n\n" +
        "First, what is the **purpose** of this procurement?\n" +
        "*(Example: 'Procurement of laboratory glassware and supplies for 1st Semester Chemistry courses')*",
      newState,
    };
  }

  const step = state.step || 'purpose';
  const collected = state.collected || {};

  switch (step) {
    case 'purpose': {
      collected.purpose = message.trim();
      newState.collected = collected;
      newState.step = 'department';
      return {
        response:
          `✅ Purpose recorded: **"${collected.purpose}"**\n\n` +
          `Next, which **department, college, or office** is requesting this?\n` +
          `*(Example: 'College of Science and Mathematics' or 'Office of the University Registrar')*`,
        newState,
      };
    }

    case 'department': {
      collected.department = message.trim();
      newState.collected = collected;
      newState.step = 'items';
      return {
        response:
          `✅ Department set: **"${collected.department}"**\n\n` +
          `Now, please list the **items** you need.\n\n` +
          `For best results, include **description, quantity, unit, and estimated unit cost** in PHP:\n` +
          `• Example: *'10 units Laptop Intel i7 at 45000 each, 2 units Laser Printer at 18000 each'*\n\n` +
          `You can write multiple items in one message. Type **done** when you are finished!`,
        newState,
      };
    }

    case 'items': {
      const existingRaw = collected.items_raw ? collected.items_raw + '; ' : '';
      collected.items_raw = existingRaw + message.trim();
      newState.collected = collected;

      const isDone = lower === 'done' || lower.includes('finish') || lower.includes("that's all") || lower.includes('thats all');

      // If user typed items or done, attempt extraction
      const fullText = `Department: ${collected.department}. Purpose: ${collected.purpose}. Items: ${collected.items_raw}`;
      const extracted = await extractPRDetails(fullText);

      if (isDone || (extracted.items && extracted.items.length > 0 && !isDone && message.length > 15)) {
        if (extracted.items && extracted.items.length > 0) {
          return buildDraftCompletionResponse(extracted, newState);
        }
      }

      return {
        response:
          `Got that. Please continue listing any additional items, or type **done** to finalize your draft.`,
        newState,
      };
    }

    default: {
      newState = { drafting: true, step: 'purpose', collected: {} };
      return {
        response: "Let's start fresh with your Purchase Request. What is the primary **purpose** of this request?",
        newState,
      };
    }
  }
}

function buildDraftCompletionResponse(
  extracted: ExtractedPR,
  newState: SessionState
): { response: string; newState: SessionState } {
  newState.drafting = false;
  newState.step = null;
  newState.collected = { extracted };

  const dept = extracted.department || 'Requesting Department (MSU-GenSan)';
  const purpose = extracted.purpose || 'Official university procurement';
  const total = extracted.total_amount || extracted.items.reduce((s, i) => s + i.total_cost, 0);

  // Encode for Printable PR page (/dashboard/pr-print?data=...)
  const printPayload = {
    department: dept,
    purpose: purpose,
    items: extracted.items,
    total_amount: total,
  };
  const encodedPrintData = encodeURIComponent(Buffer.from(JSON.stringify(printPayload)).toString('base64'));
  const printUrl = `/dashboard/pr-print?data=${encodedPrintData}`;

  // Encode for New PR Form page (/dashboard/new-pr?...)
  const itemsJson = encodeURIComponent(JSON.stringify(extracted.items));
  const newPrUrl = `/dashboard/new-pr?department=${encodeURIComponent(dept)}&purpose=${encodeURIComponent(purpose)}&items=${itemsJson}&total=${total}`;

  let summary = `🎉 **Your Purchase Request Draft is Ready!**\n\n`;
  summary += `🏢 **Department**: ${dept}\n`;
  summary += `🎯 **Purpose**: ${purpose}\n\n`;
  summary += `📦 **Items Breakdown**:\n`;

  extracted.items.forEach((item, idx) => {
    const unitPrice = item.unit_cost ? `₱${item.unit_cost.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 'TBD';
    const itemTotal = item.total_cost ? `₱${item.total_cost.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 'TBD';
    summary += `${idx + 1}. **${item.item_description}** — ${item.quantity} ${item.unit} @ ${unitPrice} = **${itemTotal}**\n`;
  });

  summary += `\n💰 **Estimated Total Amount**: **₱${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}**\n\n`;
  summary += `**Choose an action to proceed:**\n`;
  summary += `• 📝 [Open in New PR Form](${newPrUrl})\n`;
  summary += `• 🖨️ [Open Printable PR Form](${printUrl})\n\n`;
  summary += `*(Note: In accordance with RA 12009 and MSU-GenSan guidelines, please ensure this item is reflected in your unit's Project Procurement Management Plan (PPMP) prior to submission).*`;

  return { response: summary, newState };
}

// ============================================================
// MAIN ROUTE HANDLER
// ============================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, userId, sessionId } = body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const trimmedMsg = message.trim();
    const currentSessionId = sessionId || `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 1. Load session state
    let sessionData = inMemorySessions.get(currentSessionId) || { state: {}, messages: [] };
    let currentState: SessionState = sessionData.state || {};

    // If real Supabase is configured, try loading DB session state
    if (supabase && sessionId) {
      try {
        const { data } = await supabase
          .from('chat_sessions')
          .select('state')
          .eq('id', sessionId)
          .single();
        if (data?.state) {
          currentState = { ...currentState, ...data.state };
        }
      } catch (err) {
        console.warn('Could not read session from Supabase, using in-memory state');
      }
    }

    let responseText = '';
    let updatedState = { ...currentState };
    let inquiryType = 'general';
    let citedSources: string[] = [];

    // 2. Check if currently in multi-turn PR drafting
    if (currentState.drafting) {
      inquiryType = 'draft_pr';
      const result = await handleDraftPRFlow(trimmedMsg, currentState);
      responseText = result.response;
      updatedState = result.newState;
    } else {
      const lower = trimmedMsg.toLowerCase();

      // Check Intent
      const isDraftIntent = /help me draft|create a pr|new purchase request|draft a purchase request|i need to request|i want to request|i need to buy|draft pr/i.test(lower);
      const prMatch = trimmedMsg.match(/PR[- ]?(\d{4}[- ]?\d{4}|\d{4})/i);
      const isTrackIntent = Boolean(prMatch) && /status|track|where is|progress|update/i.test(lower);

      if (isDraftIntent) {
        inquiryType = 'draft_pr';
        const result = await handleDraftPRFlow(trimmedMsg, currentState);
        responseText = result.response;
        updatedState = result.newState;
      } else if (isTrackIntent && prMatch) {
        inquiryType = 'track_pr';
        const rawPR = prMatch[1].replace(/\s+/g, '');
        const formattedPR = rawPR.startsWith('2026') ? `PR-${rawPR}` : (rawPR.startsWith('PR') ? rawPR : `PR-${rawPR}`);
        responseText = await handleTrackPR(formattedPR);
      } else {
        // General Q&A / Procurement Assistant with RAG grounded in Supabase document_chunks
        inquiryType = 'procurement_guidance';
        const retrieval = await retrieveDocumentChunks(trimmedMsg, 4);
        const retrievedDocs = retrieval.formattedContext;
        const sourcesList = retrieval.sources;
        citedSources = sourcesList;

        const systemPrompt = `
You are Isko BidDo, the official AI Procurement Assistant for Mindanao State University - General Santos (MSU-GenSan).

CRITICAL DIRECTIVE — GROUNDING IN DOCUMENT_CHUNKS & AVOIDING HALLUCINATIONS:
1. You have been provided with verified excerpts retrieved directly from the university's \`document_chunks\` database table, containing official texts of Republic Act No. 12009 (New Government Procurement Act - NGPA), Republic Act No. 9184, its Implementing Rules and Regulations (IRR), and the MSU-GenSan Procurement Operations Manual.
2. Ground all answers firmly in these verified document chunks to prevent hallucinations.
3. Explicitly cite the document source (e.g. "[Source: RA 12009]", "[Source: MSU Procurement Manual]", "[Source: IRR 2016]") when explaining procurement rules, thresholds, and requirements.
4. If the retrieved database context does not provide sufficient detail to answer a specific institutional inquiry, state what the law provides and advise the user to consult the MSU-GenSan Procurement Management Office (PMO) or BAC Secretariat rather than guessing or fabricating rules or thresholds.
5. Provide a helpful, clear, and structured answer using markdown headings, bullet points, and bold emphasis for key procurement terms.
`;

        const userPrompt = `
=== VERIFIED EXCERPTS FROM SUPABASE \`document_chunks\` ===
${retrievedDocs || 'No specific document chunk found in database. Rely strictly on verified Philippine public procurement laws (RA 12009 / RA 9184) without speculating.'}

=== USER INQUIRY ===
"${trimmedMsg}"

Please provide a clear, accurate, grounded response adhering strictly to the verified excerpts above.
`;

        const aiResponse = await callGeminiWithFallback(userPrompt, systemPrompt, 0.2);

        if (aiResponse) {
          responseText = aiResponse;
        } else {
          // Fallback to offline knowledge engine grounded in retrieved chunks
          responseText = generateOfflineProcurementResponse(trimmedMsg, retrievedDocs, sourcesList);
        }
      }
    }

    // 3. Update session in memory
    sessionData.state = updatedState;
    sessionData.messages.push(
      { sender: 'user', content: trimmedMsg, time: new Date().toISOString() },
      { sender: 'ai', content: responseText, time: new Date().toISOString() }
    );
    inMemorySessions.set(currentSessionId, sessionData);

    // 4. Safely persist to Supabase if available
    if (supabase) {
      try {
        if (!sessionId && userId) {
          await supabase.from('chat_sessions').insert({
            id: currentSessionId,
            user_id: userId,
            title: trimmedMsg.slice(0, 40),
            state: updatedState,
          });
        } else if (sessionId) {
          await supabase
            .from('chat_sessions')
            .update({ state: updatedState, updated_at: new Date().toISOString() })
            .eq('id', sessionId);
        }

        await supabase.from('chat_messages').insert([
          { session_id: currentSessionId, sender: 'user', content: trimmedMsg },
          { session_id: currentSessionId, sender: 'ai', content: responseText },
        ]);

        // Also log to monitor_inquiries for admin visibility
        await supabase.from('monitor_inquiries').insert({
          user_id: userId || 'anonymous',
          user_name: 'ProcuremateSU User',
          user_department: 'MSU-GenSan',
          pr_no: trimmedMsg.match(/PR[- ]?\d{4}/i)?.[0] || 'N/A',
          user_message: trimmedMsg,
          bot_response: responseText.slice(0, 1000),
          inquiry_type: inquiryType,
        });
      } catch (dbErr) {
        console.warn('Non-blocking database log notice:', dbErr);
      }
    }

    return NextResponse.json({
      response: responseText,
      sessionId: currentSessionId,
      state: updatedState,
      sources: citedSources,
    });

  } catch (error: any) {
    console.error('❌ Chat API caught error:', error);
    return NextResponse.json(
      {
        response:
          "👋 Hello! I am Isko BidDo, your MSU-GenSan procurement assistant. How can I help you today with RA 12009, Purchase Requests, or procurement tracking?",
        sessionId: 'sess_recovery',
      },
      { status: 200 }
    );
  }
}
