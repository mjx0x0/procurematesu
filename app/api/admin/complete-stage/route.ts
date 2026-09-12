import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import {
  PROCUREMENT_STAGE_KEYS,
  PROCUREMENT_STAGE_LABELS,
  TERMINAL_STAGES,
} from '@/lib/procurement-process';

type Action = 'complete' | 'remark' | 'reject';
const JSON_HEADERS = { 'Cache-Control': 'no-store' };
const RFQ_GENERATION_STAGE = 'rfq_generation';
const RFQ_EVALUATION_STAGE = 'rfq_evaluation';
const RFQ_PRINTING_STAGE = 'rfq_printing';

type RFQRecord = {
  id: string;
  pr_no: string;
  template_type: 'less_than_50k' | 'more_than_50k';
  reference_no: string;
  project_name: string;
  location: string;
  rfq_date: string;
  generated_by: string;
  form_data?: any;
  created_at: string;
  updated_at: string;
};

function isRFQFormComplete(formData: any) {
  if (!formData || typeof formData !== 'object') return false;
  const requiredText = ['reference_no', 'project_name', 'location', 'rfq_date', 'purpose', 'office', 'instructions'];
  if (requiredText.some((key) => typeof formData[key] !== 'string' || !formData[key].trim())) return false;
  if (!Array.isArray(formData.items) || formData.items.length === 0) return false;
  return formData.items.every((item: any) =>
    Number(item?.quantity) > 0 &&
    Number(item?.abc) > 0 &&
    typeof item?.technical_specifications === 'string' && item.technical_specifications.trim() &&
    typeof item?.supplier_unit === 'string' && item.supplier_unit.trim()
  );
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/json')) return NextResponse.json({ error: 'Content-Type must be application/json.' }, { status: 415, headers: JSON_HEADERS });

    const origin = req.headers.get('origin');
    const forwardedHost = req.headers.get('x-forwarded-host');
    const host = forwardedHost || req.headers.get('host');
    if (origin && host) {
      try {
        const originHost = new URL(origin).host;
        const cleanHost = host.split(':')[0];
        const cleanOriginHost = originHost.split(':')[0];
        if (originHost !== host && cleanHost !== cleanOriginHost && !cleanHost.includes('localhost') && !cleanOriginHost.includes('googleusercontent.com')) {
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
    const action: Action = body?.action === 'remark' || body?.action === 'reject' ? body.action : 'complete';

    if (!prNo) return NextResponse.json({ error: 'PR number is required.' }, { status: 400, headers: JSON_HEADERS });
    if (!/^PR-[A-Z0-9-]{3,40}$/i.test(prNo)) return NextResponse.json({ error: 'Invalid PR number format.' }, { status: 400, headers: JSON_HEADERS });
    if (remarks.length > 2000) return NextResponse.json({ error: 'Remarks must not exceed 2,000 characters.' }, { status: 400, headers: JSON_HEADERS });
    if (action === 'complete' && !PROCUREMENT_STAGE_KEYS.includes(newStatus as any)) return NextResponse.json({ error: 'Invalid procurement stage.' }, { status: 400, headers: JSON_HEADERS });
    if ((action === 'remark' || action === 'reject') && !remarks) return NextResponse.json({ error: 'A remark is required for this action.' }, { status: 400, headers: JSON_HEADERS });

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401, headers: JSON_HEADERS });

    const { data: profile, error: profileError } = await supabase.from('users').select('role, status, is_active').eq('id', user.id).single();
    if (profileError || profile?.role !== 'admin' || profile?.status !== 'approved' || profile?.is_active !== true) return NextResponse.json({ error: 'Administrator access required.' }, { status: 403, headers: JSON_HEADERS });

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!serviceRoleKey || !supabaseUrl) return NextResponse.json({ error: 'Server configuration error.' }, { status: 500, headers: JSON_HEADERS });

    const db = createSupabaseAdminClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: pr, error: prError } = await db.from('purchase_requests').select('pr_no, current_stage, current_status, purpose, total').eq('pr_no', prNo).single();
    if (prError || !pr) return NextResponse.json({ error: 'Purchase request not found.' }, { status: 404, headers: JSON_HEADERS });

    if (TERMINAL_STAGES.includes(pr.current_stage as any)) return NextResponse.json({ error: 'This purchase request is already in a terminal status.' }, { status: 409, headers: JSON_HEADERS });
    const now = new Date().toISOString();

    if (action === 'remark') {
      const currentLabel = PROCUREMENT_STAGE_LABELS[pr.current_stage] || pr.current_stage;
      const { error } = await db.from('pr_stages_completed').insert({
        pr_no: prNo, stage_name: `${currentLabel} — Remark`,
        stage_key: pr.current_stage, status: 'remark', completed_at: now, remarks,
      });
      if (error) { console.error('[complete-stage] Remark insert failed:', error.message); return NextResponse.json({ error: 'Failed to save the remark.' }, { status: 500, headers: JSON_HEADERS }); }
      await db.from('purchase_requests').update({ updated_at: now }).eq('pr_no', prNo);
      const [{ data: updatedPR }, { data: stageHistory }] = await Promise.all([
        db.from('purchase_requests').select('*').eq('pr_no', prNo).single(),
        db.from('pr_stages_completed').select('stage_name, stage_key, completed_at, remarks, status').eq('pr_no', prNo).order('completed_at', { ascending: true }),
      ]);
      return NextResponse.json({ success: true, action: 'remark', updatedPR, stageHistory }, { headers: JSON_HEADERS });
    }

    if (action === 'reject') {
      const { error: updateError } = await db.from('purchase_requests').update({ current_stage: 'rejected', current_status: 'rejected', updated_at: now }).eq('pr_no', prNo).eq('current_stage', pr.current_stage);
      if (updateError) return NextResponse.json({ error: 'Failed to reject the purchase request.' }, { status: 500, headers: JSON_HEADERS });
      const { error: historyError } = await db.from('pr_stages_completed').insert({ pr_no: prNo, stage_name: 'PR Rejected', stage_key: 'rejected', status: 'rejected', completed_at: now, remarks });
      if (historyError) {
        await db.from('purchase_requests').update({ current_stage: pr.current_stage, current_status: pr.current_status, updated_at: new Date().toISOString() }).eq('pr_no', prNo).eq('current_stage', 'rejected');
        return NextResponse.json({ error: 'Rejection history could not be recorded. No rejection was kept.' }, { status: 500, headers: JSON_HEADERS });
      }
      const [{ data: updatedPR }, { data: stageHistory }] = await Promise.all([
        db.from('purchase_requests').select('*').eq('pr_no', prNo).single(),
        db.from('pr_stages_completed').select('stage_name, stage_key, completed_at, remarks, status').eq('pr_no', prNo).order('completed_at', { ascending: true }),
      ]);
      return NextResponse.json({ success: true, action: 'reject', newStatus: 'rejected', updatedPR, stageHistory }, { headers: JSON_HEADERS });
    }

    const currentIndex = PROCUREMENT_STAGE_KEYS.indexOf(pr.current_stage as any);
    const nextIndex = PROCUREMENT_STAGE_KEYS.indexOf(newStatus as any);
    if (currentIndex < 0 || nextIndex !== currentIndex + 1) return NextResponse.json({ error: 'Invalid stage transition. The PR must follow the official 20-step procurement sequence.' }, { status: 409, headers: JSON_HEADERS });

    // Step 7: an RFQ record is mandatory before the PR can leave the generation stage.
    if (pr.current_stage === RFQ_GENERATION_STAGE && newStatus === RFQ_EVALUATION_STAGE) {
      const { data: rfq, error: rfqError } = await db
        .from('rfqs')
        .select('id,pr_no,template_type,reference_no,project_name,location,rfq_date,generated_by,form_data,created_at,updated_at')
        .eq('pr_no', prNo)
        .maybeSingle();

      if (rfqError) {
        console.error('[complete-stage] RFQ validation lookup failed:', rfqError.message);
        return NextResponse.json({ error: 'Unable to verify the RFQ form. Please open the RFQ form, complete it, and save it before proceeding.' }, { status: 500, headers: JSON_HEADERS });
      }
      if (!rfq) {
        return NextResponse.json({ error: 'RFQ form is required before Step 8. Open the RFQ form, fill in the required sections, and save it first.' }, { status: 409, headers: JSON_HEADERS });
      }
      if (!isRFQFormComplete(rfq.form_data)) {
        return NextResponse.json({ error: 'RFQ form is incomplete. Please open Step 7 RFQ Generation, complete all required administrative fields and item details, then save the RFQ before proceeding to Step 8: RFQ Evaluation.' }, { status: 409, headers: JSON_HEADERS });
      }
    }

    // Step 9 remains locked behind Step 8 because the normal sequential transition
    // check above only permits rfq_evaluation -> rfq_printing.
    if (pr.current_stage === RFQ_EVALUATION_STAGE && newStatus === RFQ_PRINTING_STAGE) {
      const { data: rfq, error: rfqError } = await db.from('rfqs').select('id,form_data').eq('pr_no', prNo).maybeSingle();
      if (rfqError || !rfq || !isRFQFormComplete(rfq.form_data)) {
        return NextResponse.json({ error: 'RFQ evaluation cannot be completed because the saved RFQ form is missing or incomplete. Open the RFQ, verify it, and save any corrections before proceeding to Step 9: RFQ Printing.' }, { status: 409, headers: JSON_HEADERS });
      }
    }

    let generatedRFQ: RFQRecord | null = null;
    let createdRFQ = false;

    // Step 7 is the RFQ-generation milestone. Create the RFQ record as part of
    // the same controlled server-side stage transition so advancing the PR cannot
    // leave Step 7 without its corresponding RFQ record.
    if (newStatus === RFQ_GENERATION_STAGE) {
      const { data: existingRFQ, error: existingRFQError } = await db
        .from('rfqs')
        .select('id,pr_no,template_type,reference_no,project_name,location,rfq_date,generated_by,form_data,created_at,updated_at')
        .eq('pr_no', prNo)
        .maybeSingle();

      if (existingRFQError) {
        console.error('[complete-stage] RFQ lookup failed:', existingRFQError.message);
        return NextResponse.json({ error: 'Unable to verify the RFQ record for this Purchase Request.' }, { status: 500, headers: JSON_HEADERS });
      }

      if (existingRFQ) {
        generatedRFQ = existingRFQ as RFQRecord;
      } else {
        const total = Number(pr.total || 0);
        const templateType = total < 50000 ? 'less_than_50k' : 'more_than_50k';
        const { data: newRFQ, error: rfqError } = await db
          .from('rfqs')
          .insert({
            pr_no: pr.pr_no,
            template_type: templateType,
            reference_no: pr.pr_no,
            project_name: pr.purpose,
            location: '',
            generated_by: user.id,
          })
          .select('id,pr_no,template_type,reference_no,project_name,location,rfq_date,generated_by,form_data,created_at,updated_at')
          .single();

        if (rfqError || !newRFQ) {
          console.error('[complete-stage] Automatic RFQ creation failed:', rfqError?.message);
          return NextResponse.json({ error: 'RFQ could not be generated for this Purchase Request. The PR was not advanced.' }, { status: 500, headers: JSON_HEADERS });
        }

        generatedRFQ = newRFQ as RFQRecord;
        createdRFQ = true;
      }
    }

    const { error: updateError } = await db.from('purchase_requests').update({ current_stage: newStatus, current_status: newStatus, updated_at: now }).eq('pr_no', prNo).eq('current_stage', pr.current_stage);
    if (updateError) {
      if (createdRFQ) await db.from('rfqs').delete().eq('id', generatedRFQ?.id || '00000000-0000-0000-0000-000000000000');
      return NextResponse.json({ error: 'Failed to update purchase request.' }, { status: 500, headers: JSON_HEADERS });
    }

    const { error: historyError } = await db.from('pr_stages_completed').insert({ pr_no: prNo, stage_name: PROCUREMENT_STAGE_LABELS[newStatus], stage_key: newStatus, status: 'completed', completed_at: now, remarks: remarks || 'No remarks provided.' });
    if (historyError) {
      await db.from('purchase_requests').update({ current_stage: pr.current_stage, current_status: pr.current_status, updated_at: new Date().toISOString() }).eq('pr_no', prNo).eq('current_stage', newStatus);
      if (createdRFQ) await db.from('rfqs').delete().eq('id', generatedRFQ?.id || '00000000-0000-0000-0000-000000000000');
      return NextResponse.json({ error: 'Stage history could not be recorded. No stage change was kept.' }, { status: 500, headers: JSON_HEADERS });
    }

    const [{ data: updatedPR }, { data: stageHistory }] = await Promise.all([
      db.from('purchase_requests').select('*').eq('pr_no', prNo).single(),
      db.from('pr_stages_completed').select('stage_name, stage_key, completed_at, remarks, status').eq('pr_no', prNo).order('completed_at', { ascending: true }),
    ]);

    return NextResponse.json({
      success: true,
      action: 'complete',
      newStatus,
      updatedPR,
      stageHistory,
      rfqGenerated: newStatus === RFQ_GENERATION_STAGE,
      rfqCreated: createdRFQ,
      rfq: generatedRFQ,
    }, { headers: JSON_HEADERS });
  } catch (error) {
    console.error('[complete-stage] Unexpected API error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500, headers: JSON_HEADERS });
  }
}