import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

const JSON_HEADERS = { 'Cache-Control': 'no-store' };

export async function DELETE(req: NextRequest) {
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

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json({ error: 'Server configuration error.' }, { status: 500, headers: JSON_HEADERS });
    }

    const admin = createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let user = null;
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      if (token) {
        const { data } = await admin.auth.getUser(token);
        if (data?.user) user = data.user;
      }
    }
    if (!user) {
      const authClient = await createClient();
      const { data } = await authClient.auth.getUser();
      if (data?.user) user = data.user;
    }
    if (!user) {
      return NextResponse.json({ error: 'Authentication required. Please sign in again.' }, { status: 401, headers: JSON_HEADERS });
    }

    const { data: profile, error: profileError } = await admin
      .from('users')
      .select('role,status,is_active')
      .eq('id', user.id)
      .maybeSingle();
    if (profileError || !profile || profile.status !== 'approved' || profile.is_active !== true || profile.role === 'admin') {
      return NextResponse.json({ error: 'Only an approved, active end-user account can delete its own draft Purchase Requests.' }, { status: 403, headers: JSON_HEADERS });
    }

    const body = await req.json().catch(() => ({}));
    const prNo = typeof body?.prNo === 'string' ? body.prNo.trim() : '';
    if (!/^PR-[A-Z0-9-]{3,40}$/i.test(prNo)) {
      return NextResponse.json({ error: 'A valid Purchase Request number is required.' }, { status: 400, headers: JSON_HEADERS });
    }

    // Lock-free conditional delete: the stage and owner predicates are part of
    // the DELETE itself, so a PR advanced to Stage 1 cannot be removed by this endpoint.
    const { data: deletedRows, error: deleteError } = await admin
      .from('purchase_requests')
      .delete()
      .eq('pr_no', prNo)
      .eq('user_id', user.id)
      .eq('current_stage', 'draft')
      .is('physical_submitted_at', null)
      .select('pr_no');

    if (deleteError) {
      console.error('[PR Draft Delete API] Delete failed:', deleteError.message);
      return NextResponse.json({ error: 'Unable to delete this draft. Please try again.' }, { status: 500, headers: JSON_HEADERS });
    }
    if (!deletedRows?.length) {
      const { data: existing } = await admin
        .from('purchase_requests')
        .select('user_id,current_stage,physical_submitted_at')
        .eq('pr_no', prNo)
        .maybeSingle();
      if (!existing || existing.user_id !== user.id) {
        return NextResponse.json({ error: 'Purchase Request not found.' }, { status: 404, headers: JSON_HEADERS });
      }
      return NextResponse.json({
        error: existing.current_stage === 'draft'
          ? 'This draft could not be deleted. Please refresh and try again.'
          : 'This Purchase Request can no longer be deleted because it has been physically submitted or advanced beyond Draft.',
      }, { status: 409, headers: JSON_HEADERS });
    }

    return NextResponse.json({ success: true, deletedPrNo: prNo }, { headers: JSON_HEADERS });
  } catch (error) {
    console.error('[PR Draft Delete API] Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500, headers: JSON_HEADERS });
  }
}
