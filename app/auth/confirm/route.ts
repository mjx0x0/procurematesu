import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ------------------------------------------------------------------
// 1. Embedding generation (uses Hugging Face Inference API)
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
// 2. Document search (vector + fallback)
// ------------------------------------------------------------------
async function searchDocuments(query: string): Promise<string> {
  console.log(`🔍 Searching for: "${query}"`);

  // 2a. Try vector similarity
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

  // 2b. Fallback: simple ILIKE (most reliable)
  console.log('🔄 Using ILIKE fallback...');
  const { data: ilikeChunks, error: ilikeError } = await supabase
    .from('document_chunks')
    .select('chunk_text')
    .ilike('chunk_text', `%${query}%`)
    .limit(10);

  if (!ilikeError && ilikeChunks && ilikeChunks.length > 0) {
    console.log(`✅ ILIKE found ${ilikeChunks.length} chunks`);
    return ilikeChunks.map((c) => c.chunk_text).join('\n\n---\n\n');
  }

  // 2c. Last resort: split query into words
  console.log('🔄 Trying word-by-word search...');
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
  return ''; // No context found
}

// ------------------------------------------------------------------
// 3. POST handler
// ------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const { message, userId } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    console.log(`📨 Received: "${message}"`);

    // 3a. Retrieve relevant context
    const context = await searchDocuments(message);
    console.log(`📚 Context length: ${context.length} chars`);

    // 3b. Build the system prompt – confident & direct
    const systemPrompt = `
You are Isko BidDo, a confident and knowledgeable procurement assistant for Mindanao State University - General Santos.

**Your Role:**
- Provide clear, accurate, and actionable answers based ONLY on the official procurement documents provided (RA 12009, RA 9184, IRR, Procurement Manuals).
- Be direct and authoritative. Do not say "I cannot find that" unless the information is genuinely absent.
- If the answer is in the documents, give it confidently without hedging or suggesting that you need more information.

**Response Style:**
- Use bullet points or numbered lists for clarity when answering complex questions.
- Keep answers concise (2–4 sentences for simple questions, bullet points for detailed ones).
- Use a professional, helpful tone.

**When Information Is Missing:**
- If the answer is not in the provided context, say: "The documents do not contain that specific information. Please refer to the official procurement manual or contact the Procurement Office for clarification."
- Do NOT add extra commentary about needing more data or suggesting the user look elsewhere.

**Context:**
${context || 'No relevant documents found.'}

**Important:**
- Always base your answer on the provided context.
- If the context contains the answer, respond directly with that answer.
- Do not apologize, hesitate, or add unnecessary disclaimers.
- Do not mention that you are an AI or that you have limitations.

Now, answer the user's question using the context above.
`;

    // 3c. Call Gemini API
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key missing. Please set GEMINI_API_KEY.' },
        { status: 500 }
      );
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `System: ${systemPrompt}\n\nUser: ${message}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 600,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Gemini error: ${response.status} ${errorText}`);
      return NextResponse.json(
        { error: 'AI service unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    const data = await response.json();
    let reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    // 3d. Clean the reply – remove any stray tags
    reply = reply.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    // 3e. If empty, fallback
    if (!reply || reply.length < 5) {
      reply =
        'The documents do not contain that specific information. Please refer to the official procurement manual or contact the Procurement Office for clarification.';
    }

    // 3f. Log inquiry (non-blocking)
    if (userId) {
      supabase
        .from('monitor_inquiries')
        .insert({
          user_id: userId,
          user_message: message,
          bot_response: reply,
          inquiry_type: 'general',
          created_at: new Date().toISOString(),
        })
        .then(
          () => {},
          (err) => console.error('❌ Logging failed:', err)
        );
    }

    return NextResponse.json({ response: reply });

  } catch (error: any) {
    console.error('❌ Chat API fatal error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}