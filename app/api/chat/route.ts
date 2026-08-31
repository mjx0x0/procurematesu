import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper: Generate embedding using Hugging Face Inference API
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
      }
    );

    if (!response.ok) {
      console.error(`❌ HF API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const result = await response.json();
    if (Array.isArray(result) && result.length > 0 && Array.isArray(result[0])) {
      return result[0];
    }
    return null;
  } catch (err) {
    console.error('❌ Embedding error:', err);
    return null;
  }
}

// Helper: Fallback to full-text search if embedding fails
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

  // Fallback: full-text search
  console.log('🔄 Falling back to full-text search...');
  const { data: chunks, error } = await supabase
    .from('document_chunks')
    .select('chunk_text')
    .textSearch('chunk_text', query, { config: 'english' })
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

    // 1. Retrieve relevant context
    const context = await searchDocuments(message);
    console.log(`📚 Context length: ${context.length} chars`);

    // 2. Prepare system prompt
    const systemPrompt = `
You are Isko BidDo, a procurement assistant for Mindanao State University - General Santos.
Answer questions based ONLY on the provided context from the official procurement documents (RA 12009, IRR, Procurement Manual).
If the answer is not in the context, say: "I cannot find that information in the procurement documents."

Context:
${context || 'No relevant documents found. Please ask about procurement procedures or RA 12009.'}
`;

    // 3. Call Groq API
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) {
      console.error('❌ GROQ_API_KEY is not set');
      return NextResponse.json(
        { error: 'Groq API key is not configured' },
        { status: 500 }
      );
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
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
      console.error(`❌ Groq API error: ${response.status} ${errorText}`);
      return NextResponse.json(
        { error: `Groq API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'No response from AI.';

    // 4. Log inquiry
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

  } catch (error) {
    console.error('❌ Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
}