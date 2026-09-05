import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { POST as legacyChatPOST } from '@/app/api/chat/route';

/**
 * Authenticated wrapper around the existing procurement chat engine.
 * The legacy engine contains the domain/RAG/PR-drafting logic; this route
 * establishes the caller identity and verifies session ownership before it
 * is allowed to run.
 */
export async function POST(request: NextRequest) {
  try {
    const authClient = await createServerClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    if (!message || message.length > 12000 || !sessionId) {
      return NextResponse.json({ error: 'Message and session are required.' }, { status: 400 });
    }

    // RLS-backed ownership check: the session must belong to the authenticated user.
    const { data: session, error: sessionError } = await authClient
      .from('chat_sessions')
      .select('id, user_id, is_active')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Chat session not found.' }, { status: 404 });
    }

    if (session.is_active === false) {
      return NextResponse.json({ error: 'This conversation is closed. Start a new chat.' }, { status: 409 });
    }

    const trustedRequest = new NextRequest(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify({
        message,
        sessionId,
        userId: user.id,
      }),
    });

    return legacyChatPOST(trustedRequest);
  } catch (error) {
    console.error('[chat/send] Unexpected error:', error);
    return NextResponse.json({ error: 'Unable to process the chat request.' }, { status: 500 });
  }
}
