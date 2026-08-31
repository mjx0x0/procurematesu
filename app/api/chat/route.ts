import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

async function searchDocuments(query: string): Promise<string> {
  const embedding = await generateEmbedding(query);
  if (embedding) {
    const { data: chunks, error } = await supabase.rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: 0.6,
      match_count: 5,
    });
    if (!error && chunks && chunks.length > 0) {
      return chunks.map((c: any) => c.chunk_text).join('\n\n');
    }
  }

  console.log('🔄 Using fallback text search...');
  const cleaned = query
    .trim()
    .replace(/[^\w\s]/gi, '')
    .split(/\s+/)
    .filter(Boolean)
    .join(' & ');

  if (!cleaned) return '';

  const { data: chunks, error } = await supabase
    .from('document_chunks')
    .select('chunk_text')
    .textSearch('chunk_text', cleaned, { config: 'english' })
    .limit(5);

  if (!error && chunks && chunks.length > 0) {
    return chunks.map((c) => c.chunk_text).join('\n\n');
  }

  return '';
}

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
You are Isko BidDo, a helpful and concise procurement assistant for Mindanao State University - General Santos.
Your answers must be based **only** on the provided context below.
If the context does not contain the answer, simply say: "I cannot find that in the procurement documents."
Do **not** include any internal reasoning, extra fluff, or thinking tags.
Answer in plain, clear English.

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
        temperature: 0.3,
        max_tokens: 500,
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
    reply = reply.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    // ✅ Fixed logging – no red line
    if (userId) {
      void supabase
        .from('monitor_inquiries')
        .insert({
          user_id: userId,
          user_message: message,
          bot_response: reply,
          inquiry_type: 'general',
          created_at: new Date().toISOString(),
        })
        .match((err: any) => console.error('❌ Logging failed:', err));
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