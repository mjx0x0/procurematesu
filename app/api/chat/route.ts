import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================
// HELPER FUNCTIONS
// ============================================================

async function generateEmbedding(text: string): Promise<number[] | null> {
  const HF_TOKEN = process.env.HF_TOKEN;
  if (!HF_TOKEN) return null;
  try {
    const response = await fetch(
      'https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2',
      {
        headers: { Authorization: `Bearer ${HF_TOKEN}`, 'Content-Type': 'application/json' },
        method: 'POST',
        body: JSON.stringify({ inputs: text }),
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!response.ok) return null;
    const result = await response.json();
    if (Array.isArray(result) && result.length > 0) {
      if (typeof result[0] === 'number') return result as number[];
      if (Array.isArray(result[0])) return result[0] as number[];
    }
    return null;
  } catch {
    return null;
  }
}

async function searchDocuments(query: string): Promise<string> {
  console.log(`🔍 Searching for: "${query}"`);
  const { data: exactChunks, error: exactError } = await supabase
    .from('document_chunks')
    .select('chunk_text')
    .ilike('chunk_text', `%${query}%`)
    .limit(5);
  if (!exactError && exactChunks && exactChunks.length > 0) {
    return exactChunks.map((c) => c.chunk_text).join('\n\n---\n\n');
  }
  const embedding = await generateEmbedding(query);
  if (embedding) {
    const { data: chunks, error } = await supabase.rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: 0.5,
      match_count: 5,
    });
    if (!error && chunks && chunks.length > 0) {
      return chunks.map((c: any) => c.chunk_text).join('\n\n---\n\n');
    }
  }
  const words = query.split(/\s+/).filter(w => w.length > 2);
  for (const word of words) {
    const { data: wordChunks, error: wordError } = await supabase
      .from('document_chunks')
      .select('chunk_text')
      .ilike('chunk_text', `%${word}%`)
      .limit(3);
    if (!wordError && wordChunks && wordChunks.length > 0) {
      return wordChunks.map((c) => c.chunk_text).join('\n\n---\n\n');
    }
  }
  return '';
}

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
  if (!response.ok) throw new Error('Gemini API error');
  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
}

async function extractPRDetails(message: string): Promise<any> {
  const systemPrompt = `
Extract purchase request details from the user's message.
Return ONLY a JSON object with:
- department: string
- purpose: string
- items: array of { item_description, quantity, unit, unit_cost, total_cost }
- total_amount: number
If a field is not mentioned, use null.
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

async function isUserAdmin(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();
  return data?.role === 'admin';
}

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
// DRAFT PR HANDLER
// ============================================================
async function handleDraftPR(
  message: string,
  state: any,
  userId: string,
  sessionId: string
): Promise<{ response: string; newState: any }> {
  console.log('📝 handleDraftPR called with state:', state);

  let newState = { ...state };

  if (!state.drafting) {
    newState.drafting = true;
    newState.step = 'purpose';
    newState.collected = {};
    return {
      response: "I'd be happy to help you draft a Purchase Request!\n\nPlease tell me the **purpose** of this procurement (e.g., 'Purchase of laptops for CSM department').",
      newState,
    };
  }

  const step = state.step || 'purpose';
  const collected = state.collected || {};
  console.log(`📝 Step: ${step}, Collected:`, collected);

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
      newState.items_guide_shown = false; // reset guide flag
      return {
        response: "Please list the **items** you need. For each item, provide description, quantity, unit, and estimated unit cost.\n\nExample: '10 laptops, unit cost 50000' or '5 printers, 20 reams of paper'.\n\nYou can also just describe everything in one sentence.\n\nType **done** when finished.",
        newState,
      };

    case 'items':
      // If first time, show guide
      if (!state.items_guide_shown) {
        newState.items_guide_shown = true;
        // Still collect the message
        collected.items_raw = (collected.items_raw || '') + ' ' + message;
        newState.collected = collected;
        return {
          response: "Got it. Please continue listing items or type **done** when you've finished.",
          newState,
        };
      }

      collected.items_raw = (collected.items_raw || '') + ' ' + message;
      newState.collected = collected;

      if (/done|finish|that's all/i.test(message)) {
        const fullDescription = `Purpose: ${collected.purpose}. Department: ${collected.department}. Items: ${collected.items_raw}`;
        const extracted = await extractPRDetails(fullDescription);
        if (extracted && extracted.items && extracted.items.length > 0) {
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
            response: "I couldn't understand the items. Please list each item with description, quantity, and unit cost, like:\n\n'10 laptops, unit cost 50000' or '5 printers, 20 reams of paper'.\n\nType **done** when finished, or try again with more detail.",
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

// ============================================================
// TRACK PR HANDLER
// ============================================================
async function handleTrackPR(prNo: string, userId: string): Promise<string> {
  const { data: pr, error } = await supabase
    .from('purchase_requests')
    .select('*, pr_stages_completed(*)')
    .eq('pr_no', prNo)
    .single();

  if (error || !pr) {
    return `I couldn't find PR ${prNo}. Please check the number and try again.`;
  }

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

// ============================================================
// STEP-BY-STEP HANDLER
// ============================================================
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
    console.log(`🆔 SessionId: ${sessionId}, UserId: ${userId}`);

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
        console.log(`✅ Created new session: ${currentSessionId}`);
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
      console.log(`📦 Session state:`, state);
    }

    // 3. Log user message
    if (currentSessionId) {
      await supabase.from('chat_messages').insert({
        session_id: currentSessionId,
        sender: 'user',
        content: message,
      });
    }

    let responseText = '';
    let newState = { ...state };

    // 4. Check if already in drafting state FIRST
    if (state.drafting === true) {
      console.log('🔄 Continuing drafting flow...');
      const result = await handleDraftPR(message, state, userId, currentSessionId);
      responseText = result.response;
      newState = result.newState;
    } else {
      // 5. Detect intent only if not already drafting
      const intent = detectIntent(message);
      console.log(`🎯 Intent: ${intent}`);

      switch (intent) {
        case 'draft_pr': {
          console.log('📝 Starting new draft...');
          const result = await handleDraftPR(message, state, userId, currentSessionId);
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
          const context = await searchDocuments(message);
          console.log(`📚 Context length: ${context.length} chars`);
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
      console.log(`✅ Updated session state:`, newState);
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