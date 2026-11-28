import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

const HEADERS = { 'Cache-Control': 'no-store' };

async function getContext() {
  const auth = await createClient();
  const { data: { user }, error } = await auth.auth.getUser();
  if (error || !user) return { response: NextResponse.json({ error: 'Authentication required.' }, { status: 401, headers: HEADERS }) };

  const { data: profile, error: profileError } = await auth
    .from('users')
    .select('role,status,is_active,full_name')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile || !['admin', 'end_user'].includes(profile.role)
      || profile.status !== 'approved' || profile.is_active !== true) {
    return { response: NextResponse.json({ error: 'An approved account is required.' }, { status: 403, headers: HEADERS }) };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { response: NextResponse.json({ error: 'Server configuration error.' }, { status: 500, headers: HEADERS }) };

  const db = createSupabaseAdminClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  return { user, profile, db };
}

async function validatePR(db: any, userId: string, role: string, prNo: string) {
  const { data: pr, error } = await db.from('purchase_requests').select('pr_no,user_id,department,printed_name').eq('pr_no', prNo).maybeSingle();
  if (error || !pr) return { error: NextResponse.json({ error: 'Purchase Request not found.' }, { status: 404, headers: HEADERS }) };
  if (role !== 'admin' && pr.user_id !== userId) {
    return { error: NextResponse.json({ error: 'You can only access messages for your own Purchase Requests.' }, { status: 403, headers: HEADERS }) };
  }
  return { pr };
}

export async function GET(req: NextRequest) {
  try {
    const context = await getContext();
    if ('response' in context) return context.response;
    const prNo = req.nextUrl.searchParams.get('prNo')?.trim() || '';
    if (!/^PR-[A-Z0-9-]{3,40}$/i.test(prNo)) return NextResponse.json({ error: 'A valid PR number is required.' }, { status: 400, headers: HEADERS });
    const access = await validatePR(context.db, context.user.id, context.profile.role, prNo);
    if ('error' in access) return access.error;
    const { data, error } = await context.db.from('pr_messages').select('id,pr_no,sender_id,sender_name,sender_role,message,created_at').eq('pr_no', prNo).order('created_at', { ascending: true });
    if (error) {
      console.error('[pr-messages] Load failed:', error.message);
      return NextResponse.json({ error: 'Unable to load PR messages.' }, { status: 500, headers: HEADERS });
    }
    return NextResponse.json({ messages: data || [] }, { headers: HEADERS });
  } catch (error) {
    console.error('[pr-messages] GET failed:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500, headers: HEADERS });
  }
}

export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get('origin');
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    if (origin && host && new URL(origin).host.split(':')[0] !== host.split(':')[0]) {
      return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403, headers: HEADERS });
    }
    if (!(req.headers.get('content-type') || '').toLowerCase().includes('application/json')) {
      return NextResponse.json({ error: 'Content-Type must be application/json.' }, { status: 415, headers: HEADERS });
    }
    const body = await req.json().catch(() => ({}));
    const prNo = typeof body.prNo === 'string' ? body.prNo.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!/^PR-[A-Z0-9-]{3,40}$/i.test(prNo)) return NextResponse.json({ error: 'A valid PR number is required.' }, { status: 400, headers: HEADERS });
    if (!message || message.length > 2000) return NextResponse.json({ error: 'Message must contain 1–2,000 characters.' }, { status: 400, headers: HEADERS });

    const context = await getContext();
    if ('response' in context) return context.response;
    const access = await validatePR(context.db, context.user.id, context.profile.role, prNo);
    if ('error' in access) return access.error;
    const senderName = String(context.profile.full_name || context.user.user_metadata?.full_name || '').trim();
    if (!senderName || senderName.includes('@')) return NextResponse.json({ error: 'Your account profile needs a registered display name before sending messages.' }, { status: 409, headers: HEADERS });

    const { data, error } = await context.db.from('pr_messages').insert({
      pr_no: prNo,
      sender_id: context.user.id,
      sender_name: senderName,
      sender_role: context.profile.role,
      message,
    }).select('id,pr_no,sender_id,sender_name,sender_role,message,created_at').single();
    if (error) {
      console.error('[pr-messages] Insert failed:', error.message);
      return NextResponse.json({ error: 'Unable to send your message. Please try again.' }, { status: 500, headers: HEADERS });
    }

    // Notify every active, approved PRO administrator when an end user sends a message.
    // Replies from admins do not generate another admin notification.
    if (context.profile.role === 'end_user') {
      const { data: admins, error: adminsError } = await context.db
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .eq('status', 'approved')
        .eq('is_active', true);

      if (adminsError) {
        console.error('[pr-messages] Unable to load PRO admins for notification:', adminsError.message);
      } else if (admins?.length) {
        const requester = String(access.pr.printed_name || senderName).trim();
        const department = String(access.pr.department || 'a university office').trim();
        const { error: notificationError } = await context.db.from('notifications').insert(
          admins.map((admin: { id: string }) => ({
            user_id: admin.id,
            pr_no: prNo,
            type: 'pr_message_received',
            title: 'New Message from End User',
            message: requester + ' sent a message about PR ' + prNo + ' (' + department + ').',
            is_read: false,
          }))
        );
        if (notificationError) {
          console.error('[pr-messages] Message saved but admin notification creation failed:', notificationError.message);
        }
      }
    }

    return NextResponse.json({ success: true, message: data }, { status: 201, headers: HEADERS });
  } catch (error) {
    console.error('[pr-messages] POST failed:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500, headers: HEADERS });
  }
}
