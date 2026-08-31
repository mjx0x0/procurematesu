import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function searchDocuments(query: string): Promise<string> {
  console.log(`🔍 Searching for: "${query}"`);

  const cleaned = query
    .trim()
    .replace(/[^\w\s]/gi, '')
    .split(/\s+/)
    .filter(Boolean)
    .join(' & ');

  if (!cleaned) return '';

  const { data, error } = await supabase
    .from('document_chunks')
    .select('chunk_text')
    .textSearch('chunk_text', cleaned, { config: 'english' })
    .limit(10);

  if (error) {
    console.error('Search error:', error);
    return '';
  }

  if (!data || data.length === 0) {
    console.log('❌ No chunks found');
    return '';
  }

  console.log(`✅ Found ${data.length} chunks`);
  // Take only top 3 to save tokens
  return data.slice(0, 3).map((row) => row.chunk_text).join('\n\n');
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
You are Isko BidDo, a professional procurement assistant for MSU-GenSan.
Your role is to help faculty and staff understand procurement processes, policies, and legal requirements.

Instructions:
- Base your answer **only** on the provided context – do not use outside knowledge.
- Synthesize information from different parts of the context to give a complete, clear answer.
- If the context does not contain enough information, say so politely and suggest what details are missing.
- Write in a warm, professional, and helpful tone – as if you're assisting a colleague in person.
- Keep your answer clear and informative.

Context:
${context || 'No relevant documents found.'}
`;

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key missing.' },
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
            maxOutputTokens: 800, // ✅ Increased for full answers
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

    reply = reply.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    if (!reply || reply.length < 5) {
      reply =
        'I cannot find enough information in the documents to answer that question. Could you please rephrase or ask about a specific procurement topic?';
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