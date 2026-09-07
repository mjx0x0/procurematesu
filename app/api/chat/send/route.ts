import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import { POST as legacyChatPOST } from '@/app/api/chat/route';

const NEW_TOPIC_PATTERN = /\b(what is|what are|how does|how do|explain|tell me about|where is|where can|when is|who is|contact|ra\s*12009|ra\s*9184|small value|svp|bidding|procurement flow|procurement office|new purchase request|draft (?:a )?pr|create (?:a )?pr|track my pr|show me my pr)\b/i;
const DRAFT_CONTINUATION_PATTERN = /\b(purpose|department|office|section|item|items|quantity|unit|price|cost|budget|supplier|description|yes|no|correct|continue|next)\b/i;
const PR_PATTERN = /\bPR[- ]?(\d{4}[- ]?\d{4}|\d{4})\b/i;
const PR_ACCESS_PATTERN = /\b(track|show|view|see|open|display|details?|status|progress|update|history|timeline)\b/i;
const OTHER_USER_PR_PATTERN = /\b(another|other|someone\s+else|somebody\s+else|different)\s+(user|person|account|requester)|\b(?:someone\s+else'?s|another\s+user'?s|other\s+user'?s)\b/i;

function shouldResetDrafting(message: string) {
  return NEW_TOPIC_PATTERN.test(message) && !DRAFT_CONTINUATION_PATTERN.test(message);
}

// Context is intentionally disabled at this boundary. The frontend already keeps the
// visible conversation history, while the server keeps the authenticated session state.
// Re-injecting the rendered transcript here caused recursive "Conversation context"
// blocks to become part of the next user message.
function extractCurrentUserMessage(message: string): string {
  const marker = /(?:^|\n)Current user message:\s*/i;
  const match = message.match(marker);
  if (!match || match.index === undefined) return message.trim();
  return message.slice(match.index + match[0].length).trim();
}

export async function POST(request: NextRequest) {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    const db = (serviceRoleKey && supabaseUrl)
      ? createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : null;

    let user = null;
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ') && db) {
      const token = authHeader.replace('Bearer ', '').trim();
      const { data: tokenAuth, error: tokenError } = await db.auth.getUser(token);
      if (!tokenError && tokenAuth?.user) user = tokenAuth.user;
    }

    const authClient = await createServerClient();
    if (!user) {
      const { data: cookieAuth, error: authError } = await authClient.auth.getUser();
      if (!authError && cookieAuth?.user) user = cookieAuth.user;
    }

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const clientToUse = db || authClient;
    const { data: profile, error: profileError } = await clientToUse
      .from('users')
      .select('is_active, role')
      .eq('id', user.id)
      .maybeSingle();
    if (profileError || !profile || profile.is_active === false) {
      return NextResponse.json({ error: 'Account is not authorized.' }, { status: 403 });
    }

    const body = await request.json();
    const rawMessage = typeof body?.message === 'string' ? body.message.trim() : '';
    const message = extractCurrentUserMessage(rawMessage);
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : '';

    if (!message || message.length > 12000 || !sessionId) {
      return NextResponse.json({ error: 'Message and session are required.' }, { status: 400 });
    }

    const { data: session, error: sessionError } = await clientToUse
      .from('chat_sessions')
      .select('id, user_id, is_active, state')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (sessionError || !session) return NextResponse.json({ error: 'Chat session not found.' }, { status: 404 });
    if (session.is_active === false) return NextResponse.json({ error: 'This conversation is closed. Start a new chat.' }, { status: 409 });

    if (session.state?.drafting && shouldResetDrafting(message)) {
      await clientToUse
        .from('chat_sessions')
        .update({ state: {}, updated_at: new Date().toISOString() })
        .eq('id', sessionId)
        .eq('user_id', user.id);
    }

    // Every request that attempts to access a specific PR must be authorized.
    const prMatch = message.match(PR_PATTERN);
    const isPRAccessRequest = Boolean(prMatch) && PR_ACCESS_PATTERN.test(message);
    if (isPRAccessRequest) {
      const raw = prMatch![1].replace(/\s+/g, '');
      const normalized = raw.startsWith('2026') ? `PR-${raw}` : `PR-${raw.replace(/^PR/i, '')}`;

      if (profile.role !== 'admin') {
        const { data: ownedPR, error: ownershipError } = await clientToUse
          .from('purchase_requests')
          .select('pr_no')
          .eq('pr_no', normalized)
          .eq('user_id', user.id)
          .maybeSingle();

        if (ownershipError || !ownedPR) {
          return NextResponse.json(
            { error: 'Access denied. That Purchase Request is not associated with your account.' },
            { status: 403 }
          );
        }
      }
    }

    if (OTHER_USER_PR_PATTERN.test(message) && /\b(pr|prs|purchase\s+request|procurement)\b/i.test(message)) {
      return NextResponse.json(
        { error: 'Access denied. You can only view Purchase Requests associated with your account.' },
        { status: 403 }
      );
    }

    // Pass ONLY the current user question to the legacy response engine.
    // Never pass the previous rendered transcript, which prevents exponential context growth.
    const trustedRequest = new NextRequest(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify({ message, sessionId, userId: user.id }),
    });

    return legacyChatPOST(trustedRequest);
  } catch (error) {
    console.error('[chat/send] Unexpected error:', error);
    return NextResponse.json({ error: 'Unable to process the chat request.' }, { status: 500 });
  }
}
