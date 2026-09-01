import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ------------------------------------------------------------------
// Helper: Generate embedding (Hugging Face)
// ------------------------------------------------------------------
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

// ------------------------------------------------------------------
// Helper: Search documents
// ------------------------------------------------------------------
async function searchDocuments(query: string): Promise<string> {
  console.log(`🔍 Searching for: "${query}"`);
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
  const { data: ilikeChunks, error: ilikeError } = await supabase
    .from('document_chunks')
    .select('chunk_text')
    .ilike('chunk_text', `%${query}%`)
    .limit(10);
  if (!ilikeError && ilikeChunks && ilikeChunks.length > 0) {
    return ilikeChunks.map((c) => c.chunk_text).join('\n\n---\n\n');
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

// ------------------------------------------------------------------
// Helper: Call Gemini
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
        generationConfig: { temperature: 0.2, maxOutputTokens: 600 },
      }),
    }
  );
  if (!response.ok) throw new Error('Gemini API error');
  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
}

// ------------------------------------------------------------------
// Helper: Extract PR details with Gemini
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
// Main POST handler
// ------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const { message, userId, sessionId } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    console.log(`📨 Received: "${message}"`);

    // If no sessionId, create a new one
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

    // Get current session state
    let state: any = {};
    if (currentSessionId) {
      const { data } = await supabase
        .from('chat_sessions')
        .select('state')
        .eq('id', currentSessionId)
        .single();
      if (data?.state) state = data.state;
    }

    // Log user message
    if (currentSessionId) {
      await supabase.from('chat_messages').insert({
        session_id: currentSessionId,
        sender: 'user',
        content: message,
      });
    }

    let responseText = '';
    let newState = { ...state };

    // ============================================================
    // 1. Detect if user wants to draft a PR
    // ============================================================
    const draftIntents = /help me draft|create a pr|new purchase request|draft a purchase request|i need to request|i want to request/i;
    const isDraftIntent = draftIntents.test(message);

    // ============================================================
    // 2. If drafting intent detected or already in drafting state
    // ============================================================
    if (isDraftIntent || state.drafting === true) {
      if (isDraftIntent) {
        newState.drafting = true;
        newState.step = 'purpose';
        newState.collected = {};
        responseText = "I'd be happy to help you draft a Purchase Request!\n\nPlease tell me the **purpose** of this procurement (e.g., 'Purchase of laptops for CSM department').";
      } else {
        const step = state.step || 'purpose';
        const collected = state.collected || {};

        switch (step) {
          case 'purpose':
            collected.purpose = message;
            newState.collected = collected;
            newState.step = 'department';
            responseText = "Great! Now, which **department** is this for? (e.g., College of Science and Mathematics)";
            break;

          case 'department':
            collected.department = message;
            newState.collected = collected;
            newState.step = 'items';
            responseText = "Please list the **items** you need. For each item, provide description, quantity, unit, and estimated unit cost.\n\nExample: '10 laptops, unit cost 50000' or '5 printers, 20 reams of paper'.\nYou can also just describe everything in one sentence.";
            break;

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
                responseText = `✅ Draft ready! Here's a summary of your Purchase Request:\n\n` +
                  `**Department:** ${extracted.department || 'N/A'}\n` +
                  `**Purpose:** ${extracted.purpose || 'N/A'}\n` +
                  `**Items:** ${extracted.items?.length || 0} item(s)\n` +
                  `**Total Amount:** ₱${extracted.total_amount?.toFixed(2) || '0.00'}\n\n` +
                  `Click here to **print** your PR form: [🖨️ Print PR](${link})`;
                newState.drafting = false;
                newState.step = null;
              } else {
                responseText = "I couldn't parse the items. Please try again with a clear description, or use the manual form.";
                newState.step = 'items';
              }
            } else {
              responseText = "Got it. Please continue listing items or type **done** when you've finished.";
            }
            break;

          default:
            responseText = "Let's start over. What is the purpose of this Purchase Request?";
            newState.step = 'purpose';
        }
      }
    } else {
      // ============================================================
      // 3. Normal Q&A
      // ============================================================
      const context = await searchDocuments(message);
      const systemPrompt = `
You are Isko BidDo, a confident and knowledgeable procurement assistant for MSU-GenSan.
Provide clear, accurate answers based ONLY on the provided context.
Be direct and authoritative. Use bullet points if helpful.
If the answer is not in the context, say: "The documents do not contain that specific information. Please refer to the official procurement manual or contact the Procurement Office."
Context:
${context || 'No relevant documents found.'}
User question: ${message}
`;
      responseText = await callGemini(systemPrompt);
    }

    // Save assistant message
    if (currentSessionId) {
      await supabase.from('chat_messages').insert({
        session_id: currentSessionId,
        sender: 'ai',
        content: responseText,
      });
    }

    // Update session state
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
    console.error('❌ Chat API error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}