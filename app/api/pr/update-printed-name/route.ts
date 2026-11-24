import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

const JSON_HEADERS = { 'Cache-Control': 'no-store' };

export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get('origin');
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    if (origin && host && new URL(origin).host.split(':')[0] !== host.split(':')[0]) {
      return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403, headers: JSON_HEADERS });
    }

    const authClient = await createClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401, headers: JSON_HEADERS });
    }

    const body = await req.json().catch(() => ({}));
    const prNo = typeof body?.prNo === 'string' ? body.prNo.trim() : '';
    const printedName = typeof body?.printedName === 'string' ? body.printedName.trim().replace(/\\s+/g, ' ') : '';
    if (!/^PR-[A-Z0-9-]{3,40}$/i.test(prNo)) {
      return NextResponse.json({ error: 'A valid Purchase Request number is required.' }, { status: 400, headers: JSON_HEADERS });
    }
    if (printedName.length < 2 || printedName.length > 120 || printedName.includes('@') || !/[\\p{L}]{2}/u.test(printedName)) {
      return NextResponse.json({ error: 'Please enter a valid printed name.' }, { status: 400, headers: JSON_HEADERS });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json({ error: 'Server configuration error.' }, { status: 500, headers: JSON_HEADERS });
    }
    const db = createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: profile, error: profileError } = await db
      .from('users').select('role,status,is_active').eq('id', user.id).maybeSingle();
    if (profileError || !profile || profile.status !== 'approved' || profile.is_active !== true || profile.role === 'admin') {
      return NextResponse.json({ error: 'Only the active end-user who owns this draft can edit its printed name.' }, { status: 403, headers: JSON_HEADERS });
    }

    const { data: pr, error: prError } = await db
      .from('purchase_requests').select('pr_no,user_id,current_stage,physical_submitted_at').eq('pr_no', prNo).maybeSingle();
    if (prError || !pr) return NextResponse.json({ error: 'Purchase Request not found.' }, { status: 404, headers: JSON_HEADERS });
    if (pr.user_id !== user.id) return NextResponse.json({ error: 'You can only edit your own Purchase Request.' }, { status: 403, headers: JSON_HEADERS });
    if (pr.current_stage !== 'draft' || pr.physical_submitted_at) {
      return NextResponse.json({ error: 'The printed name can only be edited while the PR is still in Draft and has not been received by the Procurement Office.' }, { status: 409, headers: JSON_HEADERS });
    }

    const { data: receipt, error: stageError } = await db
      .from('pr_stages_completed').select('id').eq('pr_no', prNo).eq('stage_key', 'receipt_of_pr').limit(1);
    if (stageError) return NextResponse.json({ error: 'Unable to verify Procurement Office receipt status.' }, { status: 500, headers: JSON_HEADERS });
    if (receipt?.length) {
      return NextResponse.json({ error: 'The Procurement Office has already recorded receipt. The printed name can no longer be edited.' }, { status: 409, headers: JSON_HEADERS });
    }

    const { data: updated, error: updateError } = await db
      .from('purchase_requests').update({ printed_name: printedName }).eq('pr_no', prNo).eq('user_id', user.id).eq('current_stage', 'draft').is('physical_submitted_at', null).select('printed_name').maybeSingle();
    if (updateError || !updated) {
      console.error('[update-printed-name] Update failed:', updateError?.message || 'No row updated');
      return NextResponse.json({ error: 'Unable to update the printed name. Please refresh and try again.' }, { status: 500, headers: JSON_HEADERS });
    }

    return NextResponse.json({ success: true, printed_name: updated.printed_name }, { headers: JSON_HEADERS });
  } catch (error) {
    console.error('[update-printed-name] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500, headers: JSON_HEADERS });
  }
}
