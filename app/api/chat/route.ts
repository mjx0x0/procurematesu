import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================
// HELPER FUNCTIONS
// ============================================================

// ------------------------------------------------------------------
// Generate embedding (Hugging Face)
// ------------------------------------------------------------------
async function generateEmbedding(text: string): Promise<number[] | null> {
  const HF_TOKEN = process.env.HF_TOKEN;
  if (!HF_TOKEN) {
    console.warn('⚠️ HF_TOKEN not set, skipping embedding');
    return null;
  }

  try {
    const response = await fetch(
      'https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2',
      {
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({ inputs: text }),
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      console.warn(`⚠️ HF API status: ${response.status}`);
      return null;
    }

    const result = await response.json();
    if (Array.isArray(result) && result.length > 0) {
      if (typeof result[0] === 'number') return result as number[];
      if (Array.isArray(result[0])) return result[0] as number[];
    }
    return null;
  } catch {
    console.warn('⚠️ Embedding failed – using fallback search');
    return null;
  }
}

// ------------------------------------------------------------------
// Search documents (RAG)
// ------------------------------------------------------------------
async function searchDocuments(query: string): Promise<string> {
  console.log(`🔍 Searching for: "${query}"`);

  // 1. Exact phrase match
  const { data: exactChunks, error: exactError } = await supabase
    .from('document_chunks')
    .select('chunk_text')
    .ilike('chunk_text', `%${query}%`)
    .limit(5);

  if (!exactError && exactChunks && exactChunks.length > 0) {
    console.log(`✅ Found ${exactChunks.length} exact phrase matches`);
    return exactChunks.map((c) => c.chunk_text).join('\n\n---\n\n');
  }

  // 2. Vector similarity
  const embedding = await generateEmbedding(query);
  if (embedding) {
    const { data: chunks, error } = await supabase.rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: 0.5,
      match_count: 5,
    });
    if (!error && chunks && chunks.length > 0) {
      console.log(`✅ Vector search found ${chunks.length} chunks`);
      return chunks.map((c: any) => c.chunk_text).join('\n\n---\n\n');
    }
  }

  // 3. Keyword fallback
  console.log('🔄 Trying keyword search...');
  const words = query.split(/\s+/).filter(w => w.length > 2);
  for (const word of words) {
    const { data: wordChunks, error: wordError } = await supabase
      .from('document_chunks')
      .select('chunk_text')
      .ilike('chunk_text', `%${word}%`)
      .limit(3);
    if (!wordError && wordChunks && wordChunks.length > 0) {
      console.log(`✅ Found chunks for word: "${word}"`);
      return wordChunks.map((c) => c.chunk_text).join('\n\n---\n\n');
    }
  }

  console.log('❌ No chunks found.');
  return '';
}

// ------------------------------------------------------------------
// Call Gemini
// ------------------------------------------------------------------
async function callGemini(prompt: string): Promise<string> {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) throw new Error('Gemini API key missing');
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 400 },
      }),
    }
  );
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Gemini error: ${response.status} ${errorText}`);
    throw new Error('Gemini API error');
  }
  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
}

// ------------------------------------------------------------------
// Extract PR details (slot-filling)
// ------------------------------------------------------------------
async function extractPRDetails(message: string): Promise<any> {
  const systemPrompt = `
You are an AI assistant that extracts purchase request details from natural language.

Extract the following fields and return them as a JSON object:
- department: string (e.g., "College of Science and Mathematics")
- purpose: string (a brief description of the overall request)
- items: array of objects with:
  - item_description: string
  - quantity: number
  - unit: string (e.g., "pcs", "units", "sets")
  - unit_cost: number (estimated cost per unit)
  - total_cost: number (quantity × unit_cost)
- total_amount: number (sum of all item total costs)

If a field is not mentioned, use null.
Return ONLY the JSON object, no other text.

User input: "${message}"
`;
  const result = await callGemini(systemPrompt);
  try {
    const cleaned = result.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------
// Get status label
// ------------------------------------------------------------------
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Draft',
    pending: 'Pending',
    for_approval: 'For Approval',
    budget_office: 'Budget Office',
    chancellor_approval: 'Chancellor Approval',
    procurement_processing: 'Processing',
    canvassing: 'Canvassing',
    bidding: 'Bidding',
    for_award: 'For Award',
    po_issued: 'PO Issued',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return labels[status] || status;
}

// ------------------------------------------------------------------
// Check if user is admin
// ------------------------------------------------------------------
async function isUserAdmin(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();
  return data?.role === 'admin';
}

// ============================================================
// INTENT DETECTION
// ============================================================

function detectIntent(message: string): 'draft_pr' | 'track_pr' | 'step_by_step' | 'general' {
  const lower = message.toLowerCase();
  if (/help me draft|create a pr|new purchase request|draft a purchase request|i need to request|i want to request/.test(lower)) {
    return 'draft_pr';
  }
  if (/status of|track|where is|progress of|update on/.test(lower) && /pr[- ]?\d{4}/i.test(message)) {
    return 'track_pr';
  }
  if (/how do i|step by step|what are the steps|process of|procedure for|guide me/.test(lower)) {
    return 'step_by_step';
  }
  return 'general';
}

function extractPRNumber(message: string): string | null {
  const match = message.match(/PR[- ]?(\d{4}[- ]?\d{4})/i);
  if (match) {
    // Normalize to PR-YYYY-NNNN
    const raw = match[1];
    if (raw.length === 9) return `PR-${raw.slice(0,4)}-${raw.slice(5)}`;
    if (raw.length === 4) {
      const year = new Date().getFullYear();
      return `PR-${year}-${raw}`;
    }
    return `PR-${raw}`;
  }
  return null;
}

// ============================================================
// HANDLERS FOR EACH INTENT
// ============================================================

// ------------------------------------------------------------------
// Draft PR Handler (Slot‑Filling)
// ------------------------------------------------------------------
async function handleDraftPR(
  message: string,
  state: any,
  userId: string,
  sessionId: string,
  supabaseClient: any
): Promise<{ response: string; newState: any }> {
  let newState = { ...state };

  // If no drafting state, initialize
  if (!state.drafting) {
    newState.drafting = true;
    newState.step = 'purpose';
    newState.collected = {};
    return {
      response: "I'd be happy to help you draft a Purchase Request!\n\nPlease tell me the **purpose** of this procurement (e.g., 'Purchase of laptops for CSM department').",
      newState,
    };
  }

  // Continue the dialogue
  const step = state.step || 'purpose';
  const collected = state.collected || {};

  switch (step) {
    case 'purpose':
      collected.purpose = message;
      newState.collected = collected;
      newState.step = 'department';
      return {
        response: "Great! Now, which **department** is this for? (e.g., College of Science and Mathematics)",
        newState,
      };

    case 'department':
      collected.department = message;
      newState.collected = collected;
      newState.step = 'items';
      return {
        response: "Please list the **items** you need. For each item, provide description, quantity, unit, and estimated unit cost.\n\nExample: '10 laptops, unit cost 50000' or '5 printers, 20 reams of paper'.\nYou can also just describe everything in one sentence.",
        newState,
      };

    case 'items':
      collected.items_raw = (collected.items_raw || '') + ' ' + message;
      newState.collected = collected;

      if (/done|finish|that's all/i.test(message)) {
        const fullDescription = `Purpose: ${collected.purpose}. Department: ${collected.department}. Items: ${collected.items_raw}`;
        const extracted = await extractPRDetails(fullDescription);
        if (extracted) {
          newState.collected.extracted = extracted;
          const dataToEncode = {
            department: extracted.department || '',
            purpose: extracted.purpose || '',
            items: extracted.items || [],
            total_amount: extracted.total_amount || 0,
          };
          const encoded = encodeURIComponent(btoa(JSON.stringify(dataToEncode)));
          const link = `/dashboard/pr-print?data=${encoded}`;
          const response = `✅ Draft ready! Here's a summary of your Purchase Request:\n\n` +
            `**Department:** ${extracted.department || 'N/A'}\n` +
            `**Purpose:** ${extracted.purpose || 'N/A'}\n` +
            `**Items:** ${extracted.items?.length || 0} item(s)\n` +
            `**Total Amount:** ₱${extracted.total_amount?.toFixed(2) || '0.00'}\n\n` +
            `Click here to print your PR form:\n${link}`;
          newState.drafting = false;
          newState.step = null;
          return { response, newState };
        } else {
          return {
            response: "I couldn't parse the items. Please try again with a clear description, or use the manual form.",
            newState,
          };
        }
      } else {
        return {
          response: "Got it. Please continue listing items or type **done** when you've finished.",
          newState,
        };
      }

    default:
      return {
        response: "Let's start over. What is the purpose of this Purchase Request?",
        newState: { drafting: true, step: 'purpose', collected: {} },
      };
  }
}

// ------------------------------------------------------------------
// Track PR Handler
// ------------------------------------------------------------------
async function handleTrackPR(prNo: string, userId: string): Promise<string> {
  // Fetch PR from database
  const { data: pr, error } = await supabase
    .from('purchase_requests')
    .select('*, pr_stages_completed(*)')
    .eq('pr_no', prNo)
    .single();

  if (error || !pr) {
    return `I couldn't find PR ${prNo}. Please check the number and try again.`;
  }

  // Check if user has access (own PR or admin)
  const isAdmin = await isUserAdmin(userId);
  if (!isAdmin && pr.user_id !== userId) {
    return `You don't have permission to view PR ${prNo}.`;
  }

  const stages = pr.pr_stages_completed || [];
  const statusLabel = getStatusLabel(pr.current_stage);

  let response = `📋 **PR ${prNo}**\n`;
  response += `**Status:** ${statusLabel}\n`;
  response += `**Department:** ${pr.department}\n`;
  response += `**Purpose:** ${pr.purpose}\n`;
  response += `**Total Amount:** ₱${pr.total?.toFixed(2)}\n`;
  if (stages.length > 0) {
    response += `\n**Timeline:**\n`;
    stages.forEach((s: any) => {
      response += `- ${s.stage_name} (${new Date(s.completed_at).toLocaleDateString()})\n`;
    });
  }
  return response;
}

// ------------------------------------------------------------------
// Step-by-Step Handler
// ------------------------------------------------------------------
async function handleStepByStep(message: string): Promise<string> {
  const context = await searchDocuments(message);
  if (context) {
    const systemPrompt = `
You are Isko BidDo, a helpful procurement assistant for MSU-GenSan.
Based on the following context, provide clear, step-by-step instructions to answer the user's question.
Keep it concise and use numbered steps if applicable.
User question: ${message}
Context:
${context}
`;
    return await callGemini(systemPrompt);
  }
  return "I couldn't find step-by-step guidance for that. Please check the Procurement Manual or contact the Procurement Office.";
}

// ============================================================
// MAIN POST HANDLER
// ============================================================

export async function POST(req: NextRequest) {
  try {
    const { message, userId, sessionId } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    console.log(`📨 Received: "${message}"`);

    // 1. Get or create session
    let currentSessionId = sessionId;
    if (!currentSessionId && userId) {
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({ user_id: userId, title: 'New Conversation' })
        .select('id')
        .single();
      if (!error && data) {
        currentSessionId = data.id;
      }
    }

    // 2. Get session state
    let state: any = {};
    if (currentSessionId) {
      const { data } = await supabase
        .from('chat_sessions')
        .select('state')
        .eq('id', currentSessionId)
        .single();
      if (data?.state) state = data.state;
    }

    // 3. Log user message
    if (currentSessionId) {
      await supabase.from('chat_messages').insert({
        session_id: currentSessionId,
        sender: 'user',
        content: message,
      });
    }

    // 4. Detect intent
    const intent = detectIntent(message);

    let responseText = '';
    let newState = { ...state };

    // 5. Handle based on intent
    switch (intent) {
      case 'draft_pr': {
        const result = await handleDraftPR(message, state, userId, currentSessionId, supabase);
        responseText = result.response;
        newState = result.newState;
        break;
      }

      case 'track_pr': {
        const prNo = extractPRNumber(message);
        if (prNo) {
          responseText = await handleTrackPR(prNo, userId);
        } else {
          responseText = "I didn't see a PR number. Please provide the PR number (e.g., PR-2026-0001).";
        }
        break;
      }

      case 'step_by_step': {
        responseText = await handleStepByStep(message);
        break;
      }

      default: {
        // General Q&A with RAG
        const context = await searchDocuments(message);
        const systemPrompt = `
You are Isko BidDo, a confident procurement assistant for MSU-GenSan.
Answer the user's question based ONLY on the provided context.
If the answer is not in the context, say: "I cannot find that information in the procurement documents."
Be direct and concise. Do not add extra commentary.

Context:
${context || 'No relevant documents found.'}

User question: ${message}
`;
        responseText = await callGemini(systemPrompt);
      }
    }

    // 6. Save assistant message
    if (currentSessionId) {
      await supabase.from('chat_messages').insert({
        session_id: currentSessionId,
        sender: 'ai',
        content: responseText,
      });
    }

    // 7. Update session state
    if (currentSessionId) {
      await supabase
        .from('chat_sessions')
        .update({ state: newState })
        .eq('id', currentSessionId);
    }

    return NextResponse.json({
      response: responseText,
      sessionId: currentSessionId,
    });

  } catch (error: any) {
    console.error('❌ Chat API fatal error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}