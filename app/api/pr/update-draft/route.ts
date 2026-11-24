import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { firstValidationError, validatePurchaseRequest } from '@/lib/pr-validation';

const headers = { 'Cache-Control': 'no-store' };

export async function POST(req: NextRequest) {
  try {
    if (!(req.headers.get('content-type') || '').toLowerCase().includes('application/json')) {
      return NextResponse.json({ error: 'Content-Type must be application/json.' }, { status: 415, headers });
    }
    const origin = req.headers.get('origin');
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    if (origin && host && new URL(origin).host.split(':')[0] !== host.split(':')[0]) {
      return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403, headers });
    }
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401, headers });
    const { data: profile } = await supabase.from('users').select('role,status,is_active').eq('id', user.id).maybeSingle();
    if (!profile || profile.role !== 'end_user' || profile.status !== 'approved' || profile.is_active !== true) {
      return NextResponse.json({ error: 'An approved end-user account is required.' }, { status: 403, headers });
    }
    const body = await req.json().catch(() => ({}));
    const prNo = typeof body.prNo === 'string' ? body.prNo.trim() : '';
    const department = typeof body.department === 'string' ? body.department.trim() : '';
    const section = typeof body.section === 'string' ? body.section.trim() : '';
    const purpose = typeof body.purpose === 'string' ? body.purpose.trim() : '';
    const printedName = typeof body.printed_name === 'string' ? body.printed_name.trim() : '';
    const designation = typeof body.designation === 'string' ? body.designation.trim() : '';
    const rawItems = Array.isArray(body.items) ? body.items : [];
    if (!/^PR-[A-Z0-9-]{3,40}$/i.test(prNo)) return NextResponse.json({ error: 'A valid PR number is required.' }, { status: 400, headers });
    if (!department || !purpose || !printedName || printedName.includes('@')) return NextResponse.json({ error: 'Department, purpose, and a valid printed name are required.' }, { status: 400, headers });
    if (rawItems.length < 1 || rawItems.length > 50) return NextResponse.json({ error: 'Add between 1 and 50 items.' }, { status: 400, headers });
    const items = [];
    for (const item of rawItems) {
      const description = typeof item.description === 'string' ? item.description.trim() : '';
      const quantity = Number(item.qty ?? item.quantity);
      const unitCost = Number(item.unit_cost ?? 0);
      const unit = typeof item.unit === 'string' && item.unit.trim() ? item.unit.trim() : 'pcs';
      if (!description || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1000000 || !Number.isFinite(unitCost) || unitCost < 0 || unitCost > 1000000000) {
        return NextResponse.json({ error: 'Each item must have a valid description, quantity, and unit cost.' }, { status: 400, headers });
      }
      items.push({ item_description: description, quantity, unit, unit_cost: unitCost, total_cost: quantity * unitCost });
    }
    const validation = firstValidationError(validatePurchaseRequest({
      purpose, department, section, requestedBy: printedName, designation,
      items: items.map((item) => ({ description: item.item_description, qty: item.quantity, unit: item.unit, unit_cost: item.unit_cost })),
    }));
    if (validation) return NextResponse.json({ error: validation }, { status: 400, headers });
    const { data, error } = await supabase.rpc('update_purchase_request_draft', {
      p_pr_no: prNo,
      p_request: { department, section, purpose, printed_name: printedName, designation },
      p_items: items,
    });
    if (error || !data?.pr) {
      const message = error?.message || 'Unable to save draft.';
      const status = /no longer editable|not found|access denied/i.test(message) ? 409 : 500;
      return NextResponse.json({ error: status === 409 ? message : 'Unable to save the draft. Please retry.' }, { status, headers });
    }
    return NextResponse.json({ success: true, pr: data.pr, items: data.items || [] }, { headers });
  } catch (error) {
    console.error('[PR draft update] Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500, headers });
  }
}
