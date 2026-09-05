import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ✅ Use SERVICE ROLE KEY (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { prNo, newStatus, stageLabel, remarks } = await req.json();

    // Validate inputs
    if (!prNo || !newStatus || !stageLabel) {
      return NextResponse.json(
        { error: 'Missing required fields: prNo, newStatus, stageLabel' },
        { status: 400 }
      );
    }

    console.log(`📝 Completing stage for PR ${prNo}: ${newStatus}`);

    // 1. Update the PR's current stage
    const { error: updateError } = await supabaseAdmin
      .from('purchase_requests')
      .update({
        current_stage: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('pr_no', prNo);

    if (updateError) {
      console.error('❌ Update error:', updateError);
      throw new Error(`Failed to update PR: ${updateError.message}`);
    }

    // 2. Insert into stage history with remarks
    const { error: historyError } = await supabaseAdmin
      .from('pr_stages_completed')
      .insert({
        pr_no: prNo,
        stage_name: stageLabel,
        stage_key: newStatus,
        completed_at: new Date().toISOString(),
        remarks: remarks?.trim() || 'No remarks provided.',
      });

    if (historyError) {
      console.error('❌ History insert error:', historyError);
      throw new Error(`Failed to insert stage history: ${historyError.message}`);
    }

    console.log(`✅ Stage ${newStatus} completed for PR ${prNo}`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}