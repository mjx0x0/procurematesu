import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get('origin');
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    if (origin && host && new URL(origin).host.split(':')[0] !== host.split(':')[0]) {
      return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
    }
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    const { data: profile } = await supabase.from('users').select('role,status,is_active').eq('id', user.id).maybeSingle();
    if (!profile || profile.role !== 'end_user' || profile.status !== 'approved' || profile.is_active !== true) {
      return NextResponse.json({ error: 'An approved end-user account is required.' }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const prNo = typeof body.prNo === 'string' ? body.prNo.trim() : '';
    if (!/^PR-[A-Z0-9-]{3,40}$/i.test(prNo)) return NextResponse.json({ error: 'A valid PR number is required.' }, { status: 400 });
    const { data, error } = await supabase.rpc('submit_purchase_request_physically', { p_pr_no: prNo });
    if (error || !data?.pr) {
      const message = error?.message || 'Unable to record physical submission.';
      const status = /not found|access denied/i.test(message) ? 404 : 409;
      return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
    }
    return NextResponse.json({ success: true, pr: data.pr, already_submitted: Boolean(data.already_submitted) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[PR physical submission] Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 });
  }
}
