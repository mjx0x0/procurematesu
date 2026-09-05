import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import { POST as legacyChatPOST } from '@/app/api/chat/route';

const NEW_TOPIC_PATTERN = /\b(what is|what are|how does|how do|explain|tell me about|where is|where can|when is|who is|contact|ra\s*12009|ra\s*9184|small value|svp|bidding|procurement flow|procurement office|new purchase request|draft (?:a )?pr|create (?:a )?pr|track my pr|show me my pr)\b/i;
const DRAFT_CONTINUATION_PATTERN = /\b(purpose|department|office|section|item|items|quantity|unit|price|cost|budget|supplier|description|yes|no|correct|continue|next)\b/i;
const PR_PATTERN = /\bPR[- ]?(\d{4}[- ]?\d{4}|\d{4})\b/i;

function shouldResetDrafting(message: string) {
  return NEW_TOPIC_PATTERN.test(message) && !DRAFT_CONTINUATION_PATTERN.test(message);
}

function buildSafeContext(history: unknown) {
  if (!Array.isArray(history) || history.length === 0) return '';

  const recent = history
    .filter((entry): entry is { role: string; content: string } =>
      Boolean(entry) && typeof entry === 'object' &&
      typeof (entry as { role?: unknown }).role === 'string' &&
      typeof (entry as { content?: unknown }).content === 'string'
    )
    .slice(-12)
    .map((entry) => {
      // Memory is for the model, not the intent parser. Mask PR/status trigger
      // phrases so old tracking turns cannot hijack a new unrelated question.
      const safe = entry.content
        .replace(/PR-[A-Z0-9-]{3,40}/gi, '[purchase request reference]')
        .replace(/\btrack\b/gi, 'follow up')
        .replace(/\bstatus\b/gi, 'progress detail')
        .slice(0, 1500);
      return `${entry.role === 'assistant' ? 'Assistant' : 'User'}: ${safe}`;
    });

  return recent.length
    ? `Conversation context from earlier turns. Use this only to understand references in the current message; do not continue an old task unless the current message clearly asks for it:\n${recent.join('\n\n')}`
    : '';
}

export async function POST(request: NextRequest) {
  try {
    const authClient = await createServerClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile, error: profileError } = await authClient
      .from('users')
      .select('is_active, role')
      .eq('id', user.id)
      .maybeSingle();
    if (profileError || !profile || profile.is_active === false) {
      return NextResponse.json({ error: 'Account is not authorized.' }, { status: 403 });
    }

    const body = await request.json();
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : '';
    const history = Array.isArray(body?.history) ? body.history : [];

    if (!message || message.length > 12000 || !sessionId) {
      return NextResponse.json({ error: 'Message and session are required.' }, { status: 400 });
    }

    const { data: session, error: sessionError } = await authClient
      .from('chat_sessions')
      .select('id, user_id, is_active, state')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (sessionError || !session) return NextResponse.json({ error: 'Chat session not found.' }, { status: 404 });
    if (session.is_active === false) return NextResponse.json({ error: 'This conversation is closed. Start a new chat.' }, { status: 409 });

    // Explicitly starting a different topic must leave an old PR-drafting flow.
    if (session.state?.drafting && shouldResetDrafting(message)) {
      await authClient.from('chat_sessions').update({ state: {}, updated_at: new Date().toISOString() }).eq('id', sessionId).eq('user_id', user.id);
    }

    // A PR number in a tracking request must belong to the authenticated user.
    const prMatch = message.match(PR_PATTERN);
    if (prMatch && /\b(track|status|where is|progress|update)\b/i.test(message)) {
      const raw = prMatch[1].replace(/\s+/g, '');
      const normalized = raw.startsWith('2026') ? `PR-${raw}` : `PR-${raw.replace(/^PR/i, '')}`;
      const { data: ownedPR } = await authClient
        .from('purchase_requests')
        .select('pr_no')
        .eq('pr_no', normalized)
        .eq('user_id', user.id)
        .maybeSingle();
      if (!ownedPR) return NextResponse.json({ error: 'That Purchase Request is not associated with your account.' }, { status: 403 });
    }

    const safeContext = buildSafeContext(history);
    const engineMessage = safeContext
      ? `${safeContext}\n\nCurrent user message (this is the only message that should determine the current intent):\n${message}`
      : message;

    const trustedRequest = new NextRequest(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify({ message: engineMessage, sessionId, userId: user.id }),
    });

    return legacyChatPOST(trustedRequest);
  } catch (error) {
    console.error('[chat/send] Unexpected error:', error);
    return NextResponse.json({ error: 'Unable to process the chat request.' }, { status: 500 });
  }
}
