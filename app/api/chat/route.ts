import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { retrieveDocumentChunks } from '@/lib/document-retrieval';
import { GoogleGenAI } from '@google/genai';
import { PROCUREMENT_STAGE_LABELS } from '@/lib/procurement-process';
import { callGroq } from '@/lib/groq';

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
  cancelledAt?: string;
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
 // AI API CALL WITH GROQ PRIMARY + GEMINI FALLBACK
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
  // Groq is the primary provider for low-latency responses. Gemini remains
  // available as a server-side fallback so the chatbot keeps working if
  // GROQ_API_KEY is missing or a Groq request is temporarily unavailable.
  const groqResponse = await callGroq(prompt, systemInstruction, temperature, {
    maxOutputTokens: 1600,
    timeoutMs: 10000,
  });
  if (groqResponse) return groqResponse;

  const client = getGenAI();
  if (!client) return '';

  const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
  for (const model of modelsToTry) {
    try {
      const generatePromise = client.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction,
          temperature,
          maxOutputTokens: 1600,
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        const id = setTimeout(() => {
          clearTimeout(id);
          reject(new Error('TIMEOUT'));
        }, 14000);
      });

      const response = await Promise.race([generatePromise, timeoutPromise]);
      const text = response?.text?.trim();
      if (text) return text;
    } catch (err: any) {
      if (err?.message !== 'TIMEOUT') {
        console.warn(`[Gemini fallback] Call to ${model} failed gracefully:`, err?.message?.slice(0, 120) || 'Unknown error');
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

  if (
    q.includes('contact') ||
    q.includes('phone') ||
    q.includes('telephone') ||
    q.includes('email') ||
    q.includes('call') ||
    q.includes('location') ||
    q.includes('address') ||
    q.includes('procurement office') ||
    q.includes('bac secretariat') ||
    q.includes('reach') ||
    q.includes('hotline') ||
    q.includes('number')
  ) {
    return (
      "📞 **MSU-GenSan Procurement Management Office**\n\n" +
      "The MSU-GenSan University Directory lists **Assoc. Prof. Nelson P. Benares, Jr.** as Director of the Procurement Management Office.\n\n" +
      "• **Contact No.**: +63 908 810 5634\n" +
      "• **Office**: Procurement Management Office, under the Office of the Vice Chancellor for Administration and Finance\n" +
      "• **Campus address listed by the university**: Fatima, General Santos City, South Cotabato, Philippines, 9500\n\n" +
      "The university also issued a June 12, 2026 temporary office relocation advisory. Because the verified source does not specify a current temporary PMO room or building, I will not invent one."
    );
  }

  if (q.includes('hello') || q.includes('hi') || q.includes('hey') || q.includes('who are you')) {
    return (
      "👋 Kumusta! I am your official **AI Procurement Assistant for Mindanao State University - General Santos**.\n\n" +
      "I can help you with:\n" +
      "• **RA 12009 & RA 9184 rules**, legal principles, and procurement modes\n" +
      "• **Drafting Purchase Requests** step-by-step with instant print & form generation (try saying *'Help me draft a PR'*)\n" +
      "• **Tracking PR status** and timeline stages (e.g. *'Track PR-2026-0001'*)\n" +
      "• **Contact details** of the Procurement Management Office and BAC Secretariat\n" +
      "• **Small Value Procurement (SVP)** thresholds and PhilGEPS requirements\n\n" +
      "How may I assist you today?"
    );
  }

  return (
    "I could not find enough verified information in the procurement knowledge base to answer that specific question accurately.\n\n" +
    "Please try asking about a specific procurement rule, procedure, document, Purchase Request, or the MSU-GenSan Procurement Management Office. I will use the most relevant verified information available rather than guessing."
  );
}

function cleanAIResponse(text: string): string {
  if (!text) return text;

  let cleaned = text
    // Remove HTML/escaped HTML artifacts produced by the model.
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\\<br\s*\/?>/gi, '\n')
    .replace(/<\/?(?:div|p|span|table|thead|tbody|tr|th|td)[^>]*>/gi, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

  // Convert Markdown tables into clean, readable bullets so raw pipes and
  // separator rows never leak into the chat UI.
  const lines = cleaned.split('\n');
  const output: string[] = [];
  let inTable = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.includes('|')) {
      const cells = line
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((cell) => cell.trim())
        .filter(Boolean);

      const isSeparator =
        cells.length > 0 && cells.every((cell) => /^:?-{2,}:?$/.test(cell));

      if (isSeparator) {
        inTable = true;
        continue;
      }

      if (cells.length >= 2) {
        inTable = true;
        const isHeader =
          output.length === 0 ||
          (cells[0].toLowerCase() === 'aspect' &&
            cells[1].toLowerCase().includes('what the act provides'));

        output.push(
          isHeader
            ? '**' + cells.join(' — ') + '**'
            : '• ' + cells.join(' — ')
        );
        continue;
      }
    }

    if (line) {
      output.push(rawLine);
    } else if (!inTable || output[output.length - 1] !== '') {
      output.push('');
    }

    if (!line.includes('|')) {
      inTable = false;
    }
  }

  cleaned = output.join('\n')
    .replace(/\\\|/g, '')
    .replace(/\|/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return cleaned;
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
  // Deterministic extraction runs first for explicit procurement patterns. This
  // prevents a model response from dropping quantity/unit/cost that the user
  // already supplied in the same message.
  const ruleBased = extractPRDetailsRuleBased(text);
  const hasExplicitItemDetails =
    ruleBased.items.length > 0 &&
    ruleBased.items.some(
      (item) =>
        Number(item.quantity) > 0 &&
        String(item.unit || '').trim().length > 0 &&
        Number(item.unit_cost) > 0 &&
        String(item.item_description || '').trim().length > 2
    );

  if (hasExplicitItemDetails) {
    return ruleBased;
  }

  const extractionPrompt = `
You are an expert procurement assistant parsing purchase request details from user input.
Input: "${text}"

Extract procurement details even when the user combines the purpose, item description, quantity, unit, price, and department in one natural-language message.

Important parsing rules:
- Preserve every explicit detail supplied by the user. Never ask for a field that is already present in the input.
- If the text says "Procurement of laboratory glassware and supplies for 1st Semester Chemistry courses, 10 pieces, 500 pesos per unit", extract:
  item_description = "laboratory glassware and supplies"
  quantity = 10
  unit = "pcs"
  unit_cost = 500
  purpose = "Procurement of laboratory glassware and supplies for 1st Semester Chemistry courses"
- "10 pieces", "10 pcs", "10 units", "10 sets", etc. provide quantity and unit.
- "500 pesos per unit", "₱500 each", "PHP 500 each", "500 per piece", etc. provide unit_cost.
- If a department/college/office is explicitly stated, extract it. Otherwise return null.
- If any item field is genuinely missing, do NOT invent it. Use quantity 0, unit "", and/or unit_cost 0 so the application can ask a follow-up.
- "for 1st Semester Chemistry courses" is purpose/context unless it names a requesting department.
- If quantity and price are present but the item name is embedded in the purpose, use the relevant noun phrase before the quantity as the item description.

Return ONLY valid JSON:
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
          const qty = Math.max(0, Number(i.quantity) || 0);
          const cost = Math.max(0, Number(i.unit_cost) || 0);
          const unit = String(i.unit || '').trim();
          return {
            item_description: String(i.item_description || '').trim(),
            quantity: qty,
            unit,
            unit_cost: cost,
            total_cost: qty * cost,
          };
        });

        const total = sanitizedItems.reduce(
          (acc: number, item: any) => acc + item.total_cost,
          0
        );

        return {
          department: parsed.department ? String(parsed.department).trim() : null,
          purpose: parsed.purpose ? String(parsed.purpose).trim() : null,
          items: sanitizedItems,
          total_amount: total,
        };
      }
    }
  } catch (e) {
    console.warn('AI Extraction failed, using deterministic parser:', e);
  }

  return ruleBased;
}

function extractPRDetailsRuleBased(text: string): ExtractedPR {
  let department: string | null = null;
  const deptMatch = text.match(/(?:department|dept|college|office)\s*[:\-]?\s*([^.;,]+?)(?=\s+(?:purpose|items?)\s*[:\-]?|[.;]|$)/i);
  if (deptMatch) {
    department = deptMatch[1].trim();
  }

  // Detect a natural-language "quantity + unit + price per unit" pattern even
  // when the item name and purpose appear earlier in the same sentence.
  const qtyPriceMatch = text.match(
    /\b(\d+)\s*(pieces?|pcs?|units?|sets?|reams?|boxes?|packs?|rolls?)\b\s*(?:,|and)?\s*(?:for\s+)?(?:₱|PHP|Php)?\s*([\d,]+(?:\.\d+)?)\s*(?:pesos?|php|₱)?\s*(?:per\s+(?:unit|piece|pc|item)|each)\b/i
  );

  const items: Array<any> = [];

  if (qtyPriceMatch) {
    const qty = parseInt(qtyPriceMatch[1], 10);
    const rawUnit = qtyPriceMatch[2].toLowerCase();
    const unit = rawUnit.startsWith('piece') || rawUnit.startsWith('pc') ? 'pcs'
      : rawUnit.startsWith('unit') ? 'units'
      : rawUnit.startsWith('set') ? 'sets'
      : rawUnit.startsWith('ream') ? 'reams'
      : rawUnit.startsWith('box') ? 'boxes'
      : rawUnit.startsWith('pack') ? 'packs'
      : rawUnit.startsWith('roll') ? 'rolls' : 'pcs';
    const unitCost = parseFloat(qtyPriceMatch[3].replace(/,/g, '')) || 0;

    const beforeQuantity = text.slice(0, qtyPriceMatch.index || 0)
      .replace(/^.*?\b(?:procurement of|purchase of|procure|buying|for the procurement of)\s+/i, '')
      .replace(/\s+for\s+(?:the\s+)?(?:\d+(?:st|nd|rd|th)\s+semester\s+)?[^,;]+?\s+courses?\s*$/i, '')
      .trim()
      .replace(/[,;:]+\s*$/, '');

    const description = beforeQuantity || 'Procurement Item';
    const purposeMatch = text.match(/(?:purpose\s*[:\-]?\s*|procurement of\s+)([^,;]+(?:\s+for\s+[^,;]+)?)/i);
    const purpose = purposeMatch
      ? purposeMatch[0].replace(/^purpose\s*[:\-]?\s*/i, '').trim()
      : text.trim();

    items.push({
      item_description: description,
      quantity: qty,
      unit,
      unit_cost: unitCost,
      total_cost: qty * unitCost,
    });

    return {
      department,
      purpose,
      items,
      total_amount: qty * unitCost,
    };
  }

  // Conventional "10 units Laptop at 45000 each" / multi-item parsing.
  const lines = text.split(/[.;\n]/).filter(l => l.trim().length > 3);
  for (const line of lines) {
    const match = line.match(/(\d+)\s*([a-zA-Z]+)?\s*([^@\d]+?)(?:(?:at|@|costing|cost)\s*(?:₱|PHP|Php)?\s*([\d,]+))?$/i);
    if (match) {
      const qty = parseInt(match[1], 10);
      const rawUnit = (match[2] || '').toLowerCase();
      const unit = ['pcs','pc','pieces','piece'].includes(rawUnit) ? 'pcs'
        : ['units','unit'].includes(rawUnit) ? 'units'
        : ['sets','set'].includes(rawUnit) ? 'sets'
        : ['reams','ream'].includes(rawUnit) ? 'reams'
        : ['boxes','box'].includes(rawUnit) ? 'boxes'
        : ['packs','pack'].includes(rawUnit) ? 'packs'
        : ['rolls','roll'].includes(rawUnit) ? 'rolls' : 'pcs';
      const desc = (match[3] || line).trim();
      const unitCost = match[4] ? parseFloat(match[4].replace(/,/g, '')) || 0 : 0;
      if (desc.length > 2) {
        items.push({ item_description: desc, quantity: qty, unit, unit_cost: unitCost, total_cost: qty * unitCost });
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

  const purpose = text.trim();
  const total = items.reduce((sum, item) => sum + item.total_cost, 0);
  return { department, purpose, items, total_amount: total };
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
      const extracted = await extractPRDetails(message);

      collected.purpose = extracted.purpose || message.trim();
      collected.extracted = extracted;

      if (extracted.department) {
        collected.department = extracted.department;
      }

      const itemDetails = extracted.items || [];
      const completeItems = itemDetails.filter(
        (item) =>
          String(item.item_description || '').trim().length > 2 &&
          Number(item.quantity) > 0 &&
          String(item.unit || '').trim().length > 0 &&
          Number(item.unit_cost) > 0
      );

      const incompleteItems = itemDetails.filter(
        (item) =>
          String(item.item_description || '').trim().length <= 2 ||
          Number(item.quantity) <= 0 ||
          String(item.unit || '').trim().length === 0 ||
          Number(item.unit_cost) <= 0
      );

      const missingFields: string[] = [];
      if (!extracted.department) missingFields.push('department, college, or office');
      if (itemDetails.length === 0) {
        missingFields.push('item description, quantity, unit, and estimated unit cost');
      } else if (incompleteItems.length > 0) {
        const first = incompleteItems[0];
        const missingItemFields: string[] = [];
        if (String(first.item_description || '').trim().length <= 2) missingItemFields.push('item description');
        if (Number(first.quantity) <= 0) missingItemFields.push('quantity');
        if (String(first.unit || '').trim().length === 0) missingItemFields.push('unit');
        if (Number(first.unit_cost) <= 0) missingItemFields.push('estimated unit cost');
        missingFields.push(missingItemFields.join(', '));
      }

      // If every required field is already present in one message, finish
      // immediately. The user should never have to repeat information.
      if (
        extracted.department &&
        itemDetails.length > 0 &&
        completeItems.length === itemDetails.length
      ) {
        return buildDraftCompletionResponse(
          { ...extracted, items: completeItems },
          { ...newState, drafting: false, step: null, collected }
        );
      }

      newState.collected = collected;

      if (!extracted.department) {
        newState.step = 'department';
        const captured =
          completeItems.length > 0
            ? `\n\n📦 I already captured **${completeItems.length} complete item(s)**, including quantity, unit, and estimated unit cost. You do not need to repeat them.`
            : '';

        return {
          response:
            `✅ Purpose recorded: **"${collected.purpose}"**${captured}\n\n` +
            `Next, which **department, college, or office** is requesting this?\n` +
            `*(Example: 'College of Science and Mathematics' or 'Office of the University Registrar')*`,
          newState,
        };
      }

      if (incompleteItems.length > 0) {
        newState.step = 'items';
        return {
          response:
            `✅ I captured the **${extracted.department}** as the requesting office and extracted the purpose.\n\n` +
            `📦 I still need the following item detail(s): **${missingFields.filter((f) => !f.includes('department')).join('; ')}**.\n\n` +
            `Please provide the missing information. You do not need to repeat the details you already gave.`,
          newState,
        };
      }

      // Department exists and all item fields are complete.
      return buildDraftCompletionResponse(
        { ...extracted, items: completeItems },
        { ...newState, drafting: false, step: null, collected }
      );
    }

    case 'department': {
      collected.department = message.trim();

      // If item details were already extracted from the previous message,
      // finalize now instead of asking the user to repeat them.
      if (collected.extracted?.items?.length) {
        const extracted = {
          ...collected.extracted,
          department: collected.department,
          purpose: collected.purpose || collected.extracted.purpose,
        };
        newState.collected = { ...collected, extracted };
        return buildDraftCompletionResponse(extracted, {
          ...newState,
          drafting: false,
          step: null,
          collected: { ...collected, extracted },
        });
      }

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
// VERIFIED INSTITUTIONAL FACTS
// ============================================================

function getVerifiedInstitutionalAnswer(query: string): string | null {
  const q = query.toLowerCase().replace(/\s+/g, ' ').trim();
  const procurementOffice = /\b(procurement(?: management)? office|procurement office|pmo|pro)\b/i.test(q);
  const asksDirector =
    /\b(who(?: is|['’]s)?|what is the name of|name of|identify|tell me)\b.*\b(director|head|officer|in charge)\b/i.test(q) ||
    /\b(director|head|officer|in charge)\b.*\b(who|name|person)\b/i.test(q);
  const asksContact = /\b(contact|phone|telephone|number|hotline|reach|email)\b/i.test(q);
  const asksLocation = /\b(where|location|address|located|office location)\b/i.test(q);

  if (!procurementOffice) return null;

  if (asksDirector) {
    return "👤 **Procurement Management Office Director**\n\n" +
      "The official MSU-General Santos University Directory lists **Assoc. Prof. Nelson P. Benares, Jr.** as the **Director of the Procurement Management Office**.\n\n" +
      "The office is under the **Office of the Vice Chancellor for Administration and Finance**.\n\n" +
      "📚 **Source:** MSU-GenSan University Directory";
  }

  if (asksContact) {
    return "📞 **Procurement Management Office Contact**\n\n" +
      "**Director:** Assoc. Prof. Nelson P. Benares, Jr.\n" +
      "**Contact Number:** +63 908 810 5634\n\n" +
      "The office is listed under the Office of the Vice Chancellor for Administration and Finance.\n\n" +
      "📚 **Source:** MSU-GenSan University Directory";
  }

  if (asksLocation) {
    return "📍 **Procurement Management Office**\n\n" +
      "The university directory lists the MSU-General Santos campus at **Fatima, General Santos City, South Cotabato, Philippines, 9500**, and identifies the Procurement Management Office under the Office of the Vice Chancellor for Administration and Finance.\n\n" +
      "A June 12, 2026 university advisory states that offices affected by Y-Building/Admin Building damage were to temporarily relocate to designated locations. Because the advisory does not establish a permanent current PMO location in the source used here, Gab AI should not invent a temporary office address.\n\n" +
      "📚 **Sources:** MSU-GenSan University Directory; MSU-GenSan Temporary Office Relocation Advisory";
  }

  return null;
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
          // The database is authoritative for persistent chat state.
          // Do not merge stale in-memory drafting state over a cleared DB state.
          currentState = data.state as SessionState;
        }
        if ((currentState as SessionState).cancelledAt) {
          await supabase.from('chat_sessions').update({ state: {}, updated_at: new Date().toISOString() }).eq('id', sessionId);
          inMemorySessions.delete(currentSessionId);
          return NextResponse.json({ response: '', sessionId: currentSessionId, state: {}, sources: [], cancelled: true });
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
      const isListMyPRsIntent = /\b(track\s+(my|all|submitted)\s+(pr|prs|purchase\s+requests?)|track\s+my\s+purchase\s+request|show\s+(me\s+)?my\s+(pr|prs|purchase\s+requests?)|my\s+(pr|prs|purchase\s+requests?)\s+(status|tracking|progress))\b/i.test(lower);

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
      } else if (isListMyPRsIntent) {
        inquiryType = 'track_pr';
        if (supabase) {
          try {
            let q = supabase
              .from('purchase_requests')
              .select('pr_no, purpose, total, current_stage, created_at, department')
              .order('created_at', { ascending: false });
            if (userId) {
              q = q.eq('user_id', userId);
            }
            const { data: userPrs } = await q.limit(10);
            if (userPrs && userPrs.length > 0) {
              responseText = `📋 **Here are your submitted Purchase Requests:**\n\n` +
                userPrs.map((pr: any, idx: number) => {
                  const stageName = PROCUREMENT_STAGE_LABELS[pr.current_stage] || pr.current_stage?.replace(/_/g, ' ') || 'In Progress';
                  const amount = Number(pr.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
                  return `${idx + 1}. **${pr.pr_no}** — ${pr.purpose || 'Official Procurement'}\n` +
                    `   • Current Stage: **${stageName}**\n` +
                    `   • Total Amount: ₱${amount}\n` +
                    `   • Type **"Track ${pr.pr_no}"** or tap below to view complete timeline.`;
                }).join('\n\n');
            } else {
              responseText = `📋 **You don't have any submitted Purchase Requests yet.**\n\n` +
                `Once you submit a Purchase Request, say **"Track my PR"** and I will display your real-time tracking status here.`;
            }
          } catch (loadErr) {
            console.warn('[chat] Failed to query PRs for user, falling back to general tracking message', loadErr);
            responseText = `📋 **Purchase Request Tracking**\n\nPlease provide your Purchase Request Number (e.g., **"Track PR-2026-0001"**) to view its current stage and timeline.`;
          }
        } else {
          responseText = `📋 **Purchase Request Tracking**\n\nPlease provide your Purchase Request Number (e.g., **"Track PR-2026-0001"**) to view its current stage and timeline.`;
        }
      } else {
        const institutionalAnswer = getVerifiedInstitutionalAnswer(trimmedMsg);
        if (institutionalAnswer) {
          inquiryType = 'institutional_information';
          responseText = institutionalAnswer;
        } else {
          // General Q&A / Procurement Assistant with RAG grounded in Supabase document_chunks
          inquiryType = 'procurement_guidance';
          const retrieval = await retrieveDocumentChunks(trimmedMsg, 6);
        const retrievedDocs = retrieval.formattedContext;
        const sourcesList = retrieval.sources;
        citedSources = sourcesList;

        const systemPrompt = `
You are the official AI Procurement Assistant for Mindanao State University - General Santos (MSU-GenSan).

CRITICAL DIRECTIVES:
1. You have been provided with verified excerpts retrieved directly from the university's "document_chunks" database table.
2. Ground answers firmly in the retrieved evidence. Do not invent facts that are absent from the evidence.
3. Cite the document source naturally when explaining procurement rules, thresholds, requirements, or institutional facts.
4. Treat specific institutional questions as high-precision questions. Use the retrieved institutional source that directly names the office, person, role, or contact information.
5. Never invent an institutional email, office hours, temporary location, title, or person's name.
6. The MSU-GenSan University Directory identifies **Assoc. Prof. Nelson P. Benares, Jr.** as Director of the Procurement Management Office and lists **+63 908 810 5634** as its contact number.
7. The June 12, 2026 university advisory states that offices affected by Y-Building/Admin Building damage were temporarily relocated to designated locations. Do not invent a temporary PMO location.
8. Prefer the most specific retrieved source over generic law/manual excerpts. If sources conflict, explicitly state the conflict rather than silently choosing one.
9. If the retrieved evidence does not answer a specific institutional question, say that the knowledge base does not contain enough verified information instead of guessing.
10. Be friendly, warm, and professional. Answer the user's actual question directly.
11. Aim for a medium-length response: usually about 120–250 words for a normal question. Do not stop mid-sentence or omit the conclusion.
12. Prefer 2–4 short paragraphs over long bullet lists. Use bullets only when they genuinely improve readability, with no more than 4 bullets in one list.
13. For simple definition or location/contact questions, give a direct answer first, followed by the most relevant supporting details.
14. For process questions, use a short numbered list for the actual sequence of steps and a brief explanation afterward.
15. If the user asks a very simple question, do not pad the answer just to reach a word count.
16. Do NOT use Markdown tables, pipe characters (|), HTML tags such as <br>, or escaped HTML.`;

        const userPrompt = `
=== VERIFIED EXCERPTS FROM SUPABASE \`document_chunks\` ===
${retrievedDocs || 'No specific document chunk found in database. Rely strictly on verified Philippine public procurement laws (RA 12009 / RA 9184) without speculating.'}

=== USER INQUIRY ===
"${trimmedMsg}"

Please provide a clear, accurate, grounded response adhering strictly to the verified excerpts above. Keep the answer focused on the user's question and finish the thought completely. Do not add unrelated background or a long list of additional topics.
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
    }

    // Normalize model-generated HTML/escape artifacts before returning or storing the response.
    responseText = cleanAIResponse(responseText);

    // If the user cancelled while the model was generating, discard the in-flight answer.
    if (supabase && sessionId) {
      try {
        const { data: liveSession } = await supabase.from('chat_sessions').select('state').eq('id', sessionId).single();
        if ((liveSession?.state as SessionState | null)?.cancelledAt) {
          await supabase.from('chat_sessions').update({ state: {}, updated_at: new Date().toISOString() }).eq('id', sessionId);
          inMemorySessions.delete(currentSessionId);
          return NextResponse.json({ response: '', sessionId: currentSessionId, state: {}, sources: [], cancelled: true });
        }
      } catch {}
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
          "👋 Hello! I am your AI Procurement Assistant for Mindanao State University - General Santos. How can I help you today with RA 12009, Purchase Requests, contact details, or procurement tracking?",
        sessionId: 'sess_recovery',
      },
      { status: 200 }
    );
  }
}