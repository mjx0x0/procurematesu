import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Simplified embedding – skips if HF fails
async function generateEmbedding(text: string): Promise<number[] | null> {
  const HF_TOKEN = process.env.HF_TOKEN;
  if (!HF_TOKEN) {
    console.warn('⚠️ HF_TOKEN not set, skipping embedding');
    return null;
  }

  try {
    const response = await fetch(
      'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2',
      {
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({
          inputs: text,
          options: { wait_for_model: true },
        }),
        signal: AbortSignal.timeout(5000), // 5-second timeout
      }
    );

    if (!response.ok) return null;
    const result = await response.json();
    if (Array.isArray(result) && result.length > 0 && Array.isArray(result[0])) {
      return result[0];
    }
    return null;
  } catch (err) {
    console.warn('⚠️ Embedding failed, will use fallback:', err);
    return null;
  }
}

async function searchDocuments(query: string): Promise<string> {
  // 1. Try vector search
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

  // 2. Fallback: simple full-text search
  console.log('🔄 Using fallback text search...');
  const { data: chunks, error } = await supabase
    .from('document_chunks')
    .select('chunk_text')
    .ilike('chunk_text', `%${query}%`)
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
You are Isko BidDo, a procurement assistant for MSU-GenSan.
Answer based ONLY on the provided context.
If the answer is not in the context, say: "I cannot find that in the procurement documents."

Context:
${context || 'No relevant documents found.'}
`;

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) {
      return NextResponse.json({ error: 'Groq API key missing' }, { status: 500 });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-70b-versatile', // ✅ Valid model
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        temperature: 0.3,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Groq error: ${response.status} ${errorText}`);
      return NextResponse.json(
        { error: `Groq API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'No response.';

    if (userId) {
      await supabase.from('monitor_inquiries').insert({
        user_id: userId,
        user_message: message,
        bot_response: reply,
        inquiry_type: 'general',
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ response: reply });

  } catch (error: any) {
    console.error('❌ Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error.message || '') },
      { status: 500 }
    );
  }
}