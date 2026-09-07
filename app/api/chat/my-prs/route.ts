import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

// This route runs dynamically for each request to fetch user-specific PRs
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      console.error('[my-prs] Supabase server configuration is incomplete.');
      return NextResponse.json({ error: 'Unable to load your purchase requests.' }, { status: 500 });
    }

    const db = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Support both Bearer token from client-side session and cookie authentication
    let user = null;
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim();
      const { data: tokenAuth, error: tokenError } = await db.auth.getUser(token);
      if (!tokenError && tokenAuth?.user) {
        user = tokenAuth.user;
      }
    }

    if (!user) {
      const authClient = await createServerClient();
      const { data: cookieAuth, error: authError } = await authClient.auth.getUser();
      if (!authError && cookieAuth?.user) {
        user = cookieAuth.user;
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await db
      .from('users')
      .select('is_active, role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('[my-prs] Failed to load user profile:', profileError.message);
      return NextResponse.json({ error: 'Unable to verify your account.' }, { status: 500 });
    }

    if (profile && profile.is_active === false) {
      return NextResponse.json({ error: 'Account is not authorized.' }, { status: 403 });
    }

    // Load user's PRs
    let query = db
      .from('purchase_requests')
      .select('pr_no, purpose, total, current_stage, created_at, department')
      .order('created_at', { ascending: false });

    // If regular end user, strictly scope to their user_id
    if (!profile || profile.role !== 'admin') {
      query = query.eq('user_id', user.id);
    } else {
      // If admin, first check if admin has their own PRs, otherwise return university PRs
      const { data: ownPRs } = await db
        .from('purchase_requests')
        .select('pr_no, purpose, total, current_stage, created_at, department')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (ownPRs && ownPRs.length > 0) {
        return NextResponse.json({ prs: ownPRs }, { headers: { 'Cache-Control': 'no-store' } });
      }
      query = query.limit(15);
    }

    const { data: prs, error } = await query;

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
