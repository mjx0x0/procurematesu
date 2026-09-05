import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // First authenticate with the user's normal Supabase session/cookies.
    const authClient = await createServerClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use the service-role client only AFTER authentication. This avoids a
    // common failure where RLS prevents the server route from reading the
    // user's own PRs, while the query remains strictly scoped to user.id.
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      console.error('[my-prs] Supabase server configuration is incomplete.');
      return NextResponse.json({ error: 'Unable to load your purchase requests.' }, { status: 500 });
    }

    const db = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: profile, error: profileError } = await db
      .from('users')
      .select('is_active, role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('[my-prs] Failed to load user profile:', profileError.message);
      return NextResponse.json({ error: 'Unable to verify your account.' }, { status: 500 });
    }

    if (!profile || profile.is_active === false) {
      return NextResponse.json({ error: 'Account is not authorized.' }, { status: 403 });
    }

    if (profile.role === 'admin') {
      return NextResponse.json({ prs: [] }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const { data: prs, error } = await db
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
