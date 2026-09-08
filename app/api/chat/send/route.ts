import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import { POST as legacyChatPOST } from '@/app/api/chat/route';
import { PROCUREMENT_STAGES } from '@/lib/procurement-process';

const NEW_TOPIC_PATTERN = /\b(what is|what are|how does|how do|explain|tell me about|where is|where can|when is|who is|contact|ra\s*12009|ra\s*9184|small value|svp|bidding|procurement flow|procurement office|new purchase request|draft (?:a )?pr|create (?:a )?pr|track my pr|show me my pr)\b/i;
const DRAFT_CONTINUATION_PATTERN = /\b(purpose|department|office|section|item|items|quantity|unit|price|cost|budget|supplier|description|yes|no|correct|continue|next)\b/i;
const PR_PATTERN = /\bPR[- ]?(\d{4}[- ]?\d{4}|\d{4})\b/i;
const PR_ACCESS_PATTERN = /\b(track|show|view|see|open|display|details?|status|progress|update|history|timeline)\b/i;
const OTHER_USER_PR_PATTERN = /\b(another|other|someone\s+else|somebody\s+else|different)\s+(user|person|account|requester)|\b(?:someone\s+else'?s|another\s+user'?s|other\s+user'?s)\b/i;
const PROCUREMENT_FLOW_PATTERN = /\b(?:MSU(?:[- ]?GenSan)?|Mindanao\s+State\s+University(?:\s*[-–—]\s*General\s+Santos)?|General\s+Santos)\b.{0,80}\b(?:procurement|purchas(?:e|ing)|PR|process|flow|procedure|steps?|stages?)\b|\b(?:procurement|purchasing|PR)\s+(?:flow|process|procedure|steps?|stages?)\b/i;

function shouldResetDrafting(message: string) {
  return NEW_TOPIC_PATTERN.test(message) && !DRAFT_CONTINUATION_PATTERN.test(message);
}

function extractCurrentUserMessage(message: string): string {
  const marker = /(?:^|\n)Current user message:\s*/i;
  const match = message.match(marker);
  if (!match || match.index === undefined) return message.trim();
  return message.slice(match.index + match[0].length).trim();
}

function buildProcurementFlowResponse() {
  const lines = PROCUREMENT_STAGES.map(
    (stage) => `${stage.number}. **${stage.label}** — ${stage.description}`
  ).join('\n');

  return (
    `🏛️ **MSU-General Santos 20-Stage Procurement Flow**\n\n` +
    `Here is the official **20-stage procurement workflow used in ProcuremateSU**, from receipt of the Purchase Request through monitoring and documentation.\n\n` +
    `${lines}\n\n` +
    `### Key posting thresholds\n` +
    `• **₱50,000 and above:** applicable RFQ posting to PhilGEPS\n` +
    `• **₱200,000 and above:** applicable SVP posting threshold noted in the MSU workflow\n\n` +
    `The exact stage descriptions above are taken from ProcuremateSU's centralized procurement-process definition, so the chatbot and PR tracking use the same 20-stage terminology.`
  );
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

    // Authoritative MSU-GenSan workflow response. This is intentionally handled
    // before the general AI engine so the 20 stages cannot be shortened or
    // replaced by a generic procurement flow from model memory.
    if (PROCUREMENT_FLOW_PATTERN.test(message)) {
      return NextResponse.json({
        response: buildProcurementFlowResponse(),
        sources: ['ProcuremateSU 20-stage procurement process'],
      });
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
