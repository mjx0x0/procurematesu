import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('is_active, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.is_active === false) {
      return NextResponse.json({ error: 'Account is not authorized.' }, { status: 403 });
    }

    // End users may only receive PRs belonging to their own authenticated account.
    // Admins are intentionally excluded from this endpoint because this flow is
    // specifically for the end-user chatbot's "Track my PR" action.
    if (profile.role === 'admin') {
      return NextResponse.json({ prs: [] });
    }

    const { data: prs, error } = await supabase
      .from('purchase_requests')
      .select('pr_no, purpose, total, current_stage, created_at, department')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[my-prs] Failed to load user PRs:', error.message);
      return NextResponse.json({ error: 'Unable to load your purchase requests.' }, { status: 500 });
    }

    return NextResponse.json(
      { prs: prs ?? [] },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[my-prs] Unexpected error:', error);
    return NextResponse.json({ error: 'Unable to load your purchase requests.' }, { status: 500 });
  }
}
