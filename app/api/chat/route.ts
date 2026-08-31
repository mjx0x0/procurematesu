import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Simplified search – just ILIKE (most reliable)
async function searchDocuments(query: string): Promise<string> {
  console.log(`🔍 Searching for: "${query}"`);
  const { data, error } = await supabase
    .from('document_chunks')
    .select('chunk_text')
    .ilike('chunk_text', `%${query}%`)
    .limit(5);

  if (error) {
    console.error('Search error:', error);
    return '';
  }

  if (!data || data.length === 0) {
    console.log('❌ No chunks found');
    return '';
  }

  console.log(`✅ Found ${data.length} chunks`);
  return data.map((row) => row.chunk_text).join('\n\n');
}

export async function POST(req: NextRequest) {
  try {
    const { message, userId } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

    console.log(`📨 Received: "${message}"`);

    const context = await searchDocuments(message);
    console.log(`📚 Context length: ${context.length} chars`);

    const systemPrompt = `
You are Isko BidDo, a procurement assistant for MSU-GenSan.
Answer ONLY using the provided context.
If the context does not contain the answer, say exactly: "I cannot find that in the procurement documents."
Do NOT include any internal reasoning, <think> tags, or extra fluff.
Keep your answer short (2-3 sentences).

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
        stop: ['\n\n', ' response:'],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Groq error: ${response.status} ${errorText}`);
      return NextResponse.json(
        { error: 'AI service unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    const data = await response.json();
    let reply = data.choices?.[0]?.message?.content || 'No response received.';
    reply = reply.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    if (!reply || reply.length < 5) {
      reply = 'I cannot find that in the procurement documents.';
    }

    // Log (non‑blocking)
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