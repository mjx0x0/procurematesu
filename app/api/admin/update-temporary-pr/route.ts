import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

const JSON_HEADERS = { 'Cache-Control': 'no-store' };

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/json')) {
      return NextResponse.json({ error: 'Content-Type must be application/json.' }, { status: 415, headers: JSON_HEADERS });
    }

    const origin = req.headers.get('origin');
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    if (origin && host) {
      try {
        const originHost = new URL(origin).host;
        if (originHost !== host && originHost.split(':')[0] !== host.split(':')[0]
          && !host.split(':')[0].includes('localhost')) {
          return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403, headers: JSON_HEADERS });
        }
      } catch {
        return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403, headers: JSON_HEADERS });
      }
    }

    const body = await req.json().catch(() => ({}));
    const currentPrNo = typeof body?.currentPrNo === 'string' ? body.currentPrNo.trim() : '';
    const newTemporaryPrNo = typeof body?.newTemporaryPrNo === 'string' ? body.newTemporaryPrNo.trim().toUpperCase() : '';
    if (!/^PR-[A-Z0-9-]{3,40}$/i.test(currentPrNo)) {
      return NextResponse.json({ error: 'A valid current PR number is required.' }, { status: 400, headers: JSON_HEADERS });
    }
    if (!/^PR-TEMP-[A-Z0-9-]{3,32}$/.test(newTemporaryPrNo)) {
      return NextResponse.json({ error: 'Temporary PR number must use the format PR-TEMP-YYYY-XXXX.' }, { status: 400, headers: JSON_HEADERS });
    }
    if (currentPrNo.toUpperCase() === newTemporaryPrNo) {
      return NextResponse.json({ error: 'The new temporary number must be different.' }, { status: 400, headers: JSON_HEADERS });
    }

    const authClient = await createClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401, headers: JSON_HEADERS });
    }
    const { data: profile, error: profileError } = await authClient
      .from('users').select('role,status,is_active').eq('id', user.id).maybeSingle();
    if (profileError || profile?.role !== 'admin' || profile.status !== 'approved' || profile.is_active !== true) {
      return NextResponse.json({ error: 'Administrator access required.' }, { status: 403, headers: JSON_HEADERS });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json({ error: 'Server configuration error.' }, { status: 500, headers: JSON_HEADERS });
    }
    const db = createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await db.rpc('update_temporary_purchase_request_number', {
      p_current_pr_no: currentPrNo,
      p_new_temporary_pr_no: newTemporaryPrNo,
    });
    if (error || !data) {
      const message = error?.message || 'Unable to update temporary PR number.';
      const status = /not found/i.test(message) ? 404 : /already in use|only temporary|must use/i.test(message) ? 409 : 500;
      if (error) console.error('[update-temporary-pr] Transaction failed:', error.message);
      return NextResponse.json({ error: status === 500 ? 'Unable to update the temporary PR number. Please try again.' : message }, { status, headers: JSON_HEADERS });
    }
    return NextResponse.json({ success: true, ...data }, { headers: JSON_HEADERS });
  } catch (error) {
    console.error('[update-temporary-pr] Unexpected API error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500, headers: JSON_HEADERS });
  }
}
