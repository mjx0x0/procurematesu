import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// (keep generateEmbedding and searchDocuments as before – or use the improved version from previous answer)

export async function POST(req: NextRequest) {
  try {
    const { message, userId } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    console.log(`📨 Received: "${message}"`);

    const context = await searchDocuments(message);
    console.log(`📚 Context length: ${context.length} chars`);

    // 🔥 Updated system prompt – strict and clean
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

    // 🔥 Clean the reply
    reply = reply.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    // If reply contains thinking words, cut it off
    const cutoff = reply.search(/think|reasoning|explanation|context|provided/i);
    if (cutoff !== -1 && cutoff < 80) {
      reply = reply.substring(0, cutoff).trim();
    }

    if (!reply || reply.length < 5) {
      reply = 'I cannot find that in the procurement documents.';
    }

    // Log inquiry (non-blocking)
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

async function searchDocuments(message: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('content')
      .textSearch('content', message)
      .limit(5);

    if (error) {
      console.error('Search error:', error);
      return '';
    }

    return data?.map((doc: any) => doc.content).join('\n') || '';
  } catch (err) {
    console.error('Search failed:', err);
    return '';
  }
}
