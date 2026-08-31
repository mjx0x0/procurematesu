import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Simplified search – ILIKE (most reliable)
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

    // 🔥 Use Gemini API instead of Groq
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
            temperature: 0.1,
            maxOutputTokens: 150,
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
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      'No response received.';

    // Clean the reply (remove any stray tags)
    const cleanReply = reply.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    if (!cleanReply || cleanReply.length < 5) {
      return NextResponse.json({
        response: 'I cannot find that in the procurement documents.',
      });
    }

    // Log (non‑blocking)
    if (userId) {
      supabase
        .from('monitor_inquiries')
        .insert({
          user_id: userId,
          user_message: message,
          bot_response: cleanReply,
          inquiry_type: 'general',
          created_at: new Date().toISOString(),
        })
        .then(
          () => {},
          (err) => console.error('❌ Logging failed:', err)
        );
    }

    return NextResponse.json({ response: cleanReply });
  } catch (error: any) {
    console.error('❌ Chat API fatal error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}