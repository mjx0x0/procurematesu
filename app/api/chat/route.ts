import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ------------------------------------------------------------------
// 1. Embedding generation
// ------------------------------------------------------------------
async function generateEmbedding(text: string): Promise<number[] | null> {
  const HF_TOKEN = process.env.HF_TOKEN;
  if (!HF_TOKEN) return null;

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
    console.warn('⚠️ Embedding failed – using fallback');
    return null;
  }
}

// ------------------------------------------------------------------
// 2. Document search (vector + fallback)
// ------------------------------------------------------------------
async function searchDocuments(query: string): Promise<string> {
  console.log(`🔍 Searching for: "${query}"`);

  // 1. Try vector similarity (if embedding works)
  const embedding = await generateEmbedding(query);
  if (embedding) {
    const { data: chunks, error } = await supabase.rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: 0.5,
      match_count: 5,
    });
    if (!error && chunks && chunks.length > 0) {
      console.log(`✅ Vector search found ${chunks.length} chunks`);
      return chunks.map((c: any) => c.chunk_text).join('\n\n');
    }
  }

  // 2. Fallback: simple ILIKE (most reliable)
  console.log('🔄 Using ILIKE fallback...');
  const { data: ilikeChunks, error: ilikeError } = await supabase
    .from('document_chunks')
    .select('chunk_text')
    .ilike('chunk_text', `%${query}%`)
    .limit(5);

  if (!ilikeError && ilikeChunks && ilikeChunks.length > 0) {
    console.log(`✅ ILIKE found ${ilikeChunks.length} chunks`);
    return ilikeChunks.map((c) => c.chunk_text).join('\n\n');
  }

  // 3. Last resort: split query into words
  console.log('🔄 Trying word-by-word search...');
  const words = query.split(/\s+/).filter(w => w.length > 3);
  for (const word of words) {
    const { data: wordChunks, error: wordError } = await supabase
      .from('document_chunks')
      .select('chunk_text')
      .ilike('chunk_text', `%${word}%`)
      .limit(3);
    if (!wordError && wordChunks && wordChunks.length > 0) {
      console.log(`✅ Found chunks for word: "${word}"`);
      return wordChunks.map((c) => c.chunk_text).join('\n\n');
    }
  }

  console.log('❌ No chunks found.');
  return '';
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

    const context = await searchDocuments(message);
    console.log(`📚 Context length: ${context.length} chars`);

    const systemPrompt = `
You are Isko BidDo, a concise and helpful procurement assistant for MSU-GenSan.

RULES:
- Answer ONLY using the provided context.
- If the context does not contain the answer, say exactly: "I cannot find that in the procurement documents."
- Do NOT include any internal reasoning, thinking, or explanations about how you arrived at the answer.
- Do NOT use tags like <think> or <reasoning>.
- Provide only the final answer in plain, clear English.
- Keep your answer short and direct (2-3 sentences maximum).

Context:
${context || 'No relevant documents found.'}
`;

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) {
      return NextResponse.json(
        { error: 'Groq API key missing. Please contact admin.' },
        { status: 500 }
      );
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen/qwen3.6-27b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        temperature: 0.1,
        max_tokens: 150,
        stop: ['\n\n', ' response:', 'Answer:'],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Groq error: ${response.status} ${errorText}`);
      return NextResponse.json(
        { error: 'The AI service is temporarily unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    const data = await response.json();
    let reply = data.choices?.[0]?.message?.content || 'No response received.';

    // Clean the reply
    reply = reply.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    // If reply contains thinking words, cut it off
    const cutoff = reply.search(/think|reasoning|explanation|context|provided/i);
    if (cutoff !== -1 && cutoff < 80) {
      reply = reply.substring(0, cutoff).trim();
    }

    if (!reply || reply.length < 5) {
      reply = 'I cannot find that in the procurement documents.';
    }

    // ✅ Fixed logging – uses .then(success, error) instead of .catch
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
      { error: 'Something went wrong. Please try again in a moment.' },
      { status: 500 }
    );
  }
}