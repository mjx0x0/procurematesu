import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

const STAGE_FLOW = [
  'pending',
  'budget_office',
  'chancellor_approval',
  'procurement_processing',
  'canvassing',
  'for_award',
  'po_issued',
  'completed',
] as const;

const STAGE_LABELS: Record<string, string> = {
  pending: 'PR Submission',
  budget_office: 'Budget Clearance',
  chancellor_approval: 'Chancellor Approval',
  procurement_processing: 'RFQ Generation',
  canvassing: 'Abstract of Quotations',
  for_award: 'BAC Endorsement',
  po_issued: 'PO Issued',
  completed: 'Completed',
};

const JSON_HEADERS = {
  'Cache-Control': 'no-store',
};

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/json')) {
      return NextResponse.json({ error: 'Content-Type must be application/json.' }, { status: 415, headers: JSON_HEADERS });
    }

    const origin = req.headers.get('origin');
    const host = req.headers.get('host');
    if (origin && host) {
      try {
        const originUrl = new URL(origin);
        if (originUrl.host !== host) {
          return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403, headers: JSON_HEADERS });
        }
      } catch {
        return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403, headers: JSON_HEADERS });
      }
    }

    const body = await req.json();
    const prNo = typeof body?.prNo === 'string' ? body.prNo.trim() : '';
    const newStatus = typeof body?.newStatus === 'string' ? body.newStatus.trim() : '';
    const remarks = typeof body?.remarks === 'string' ? body.remarks.trim() : '';

    if (!prNo || !newStatus) {
      return NextResponse.json({ error: 'PR number and new status are required.' }, { status: 400, headers: JSON_HEADERS });
    }

    if (!/^PR-[A-Z0-9-]{3,40}$/i.test(prNo)) {
      return NextResponse.json({ error: 'Invalid PR number format.' }, { status: 400, headers: JSON_HEADERS });
    }

    if (!STAGE_FLOW.includes(newStatus as (typeof STAGE_FLOW)[number])) {
      return NextResponse.json({ error: 'Invalid procurement stage.' }, { status: 400, headers: JSON_HEADERS });
    }

    if (remarks.length > 2000) {
      return NextResponse.json({ error: 'Remarks must not exceed 2,000 characters.' }, { status: 400, headers: JSON_HEADERS });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401, headers: JSON_HEADERS });
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin' || profile?.is_active === false) {
      return NextResponse.json({ error: 'Administrator access required.' }, { status: 403, headers: JSON_HEADERS });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!serviceRoleKey || !supabaseUrl) {
      console.error('[complete-stage] Server-side Supabase configuration is incomplete.');
      return NextResponse.json({ error: 'Server configuration error.' }, { status: 500, headers: JSON_HEADERS });
    }

    const supabaseAdmin = createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: pr, error: prError } = await supabaseAdmin
      .from('purchase_requests')
      .select('pr_no, current_stage')
      .eq('pr_no', prNo)
      .single();

    if (prError || !pr) {
      return NextResponse.json({ error: 'Purchase request not found.' }, { status: 404, headers: JSON_HEADERS });
    }

    const currentIndex = STAGE_FLOW.indexOf(pr.current_stage as (typeof STAGE_FLOW)[number]);
    const nextIndex = STAGE_FLOW.indexOf(newStatus as (typeof STAGE_FLOW)[number]);

    if (currentIndex < 0 || nextIndex !== currentIndex + 1) {
      return NextResponse.json({ error: 'Invalid stage transition.' }, { status: 409, headers: JSON_HEADERS });
    }

    const now = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from('purchase_requests')
      .update({ current_stage: newStatus, updated_at: now })
      .eq('pr_no', prNo)
      .eq('current_stage', pr.current_stage);

    if (updateError) {
      console.error('[complete-stage] PR update failed:', updateError);
      return NextResponse.json({ error: 'Failed to update purchase request.' }, { status: 500, headers: JSON_HEADERS });
    }

    const { error: historyError } = await supabaseAdmin
      .from('pr_stages_completed')
      .insert({
        pr_no: prNo,
        stage_name: STAGE_LABELS[newStatus],
        stage_key: newStatus,
        completed_at: now,
        remarks: remarks || 'No remarks provided.',
      });

    if (historyError) {
      console.error('[complete-stage] Stage history insert failed:', historyError);
      // Compensating update: keep PR state consistent if history recording fails.
      await supabaseAdmin
        .from('purchase_requests')
        .update({ current_stage: pr.current_stage, updated_at: new Date().toISOString() })
        .eq('pr_no', prNo)
        .eq('current_stage', newStatus);
      return NextResponse.json({ error: 'Stage history could not be recorded. No stage change was kept.' }, { status: 500, headers: JSON_HEADERS });
    }

    return NextResponse.json({ success: true }, { headers: JSON_HEADERS });
  } catch (error) {
    console.error('[complete-stage] Unexpected API error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500, headers: JSON_HEADERS });
  }
}
