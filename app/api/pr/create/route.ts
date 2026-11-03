import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { firstValidationError, validatePurchaseRequest } from '@/lib/pr-validation';

interface SanitizedItem {
  item_description: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  total_cost: number;
}

const JSON_HEADERS = { 'Cache-Control': 'no-store' };
const MAX_ITEMS = 50;
const MAX_QTY = 1_000_000;
const MAX_UNIT_COST = 1_000_000_000;
const MAX_TOTAL = 1_000_000_000_000;

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/json')) {
      return NextResponse.json({ error: 'Content-Type must be application/json.' }, { status: 415, headers: JSON_HEADERS });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json({ error: 'Server configuration error: database credentials not available.' }, { status: 500, headers: JSON_HEADERS });
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
      try {
        const supabase = await createClient();
        const { data } = await supabase.auth.getUser();
        if (data?.user) user = data.user;
      } catch {}
    }
    if (!user) {
      return NextResponse.json({ error: 'Authentication required. Please sign in again.' }, { status: 401, headers: JSON_HEADERS });
    }

    // This endpoint uses service-role writes; enforce account approval here.
    const { data: profile, error: profileError } = await admin
      .from('users')
      .select('role,status,is_active')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError || !profile || profile.status !== 'approved' || profile.is_active !== true) {
      return NextResponse.json({ error: 'Your account must be approved and active to create a Purchase Request.' }, { status: 403, headers: JSON_HEADERS });
    }

    const body = await req.json().catch(() => ({}));
    const department = typeof body?.department === 'string' ? body.department.trim() : '';
    const section = typeof body?.section === 'string' && body.section.trim() ? body.section.trim() : null;
    const purpose = typeof body?.purpose === 'string' ? body.purpose.trim() : '';
    let printedName = typeof body?.printed_name === 'string' ? body.printed_name.trim() : '';
    const designation = typeof body?.designation === 'string' && body.designation.trim() ? body.designation.trim() : null;
    const rawItems = Array.isArray(body?.items) ? body.items : [];

    if (!printedName) printedName = (user.user_metadata?.full_name || '').trim();
    if (!department) return NextResponse.json({ error: 'Please enter your department.' }, { status: 400, headers: JSON_HEADERS });
    if (!purpose) return NextResponse.json({ error: 'Please enter the purpose for this purchase request.' }, { status: 400, headers: JSON_HEADERS });
    if (!printedName || printedName.includes('@')) {
      return NextResponse.json({ error: 'Please provide your actual full name in the Requested By field, not an email address.' }, { status: 400, headers: JSON_HEADERS });
    }
    if (rawItems.length < 1 || rawItems.length > MAX_ITEMS) {
      return NextResponse.json({ error: 'Add between 1 and ' + MAX_ITEMS + ' valid PR items.' }, { status: 400, headers: JSON_HEADERS });
    }

    const sanitizedItems: SanitizedItem[] = [];
    for (const item of rawItems) {
      const descriptionValue = item && typeof item === 'object'
        ? (typeof item.description === 'string' ? item.description : item.item_description)
        : null;
      if (typeof descriptionValue !== 'string' || !descriptionValue.trim()) {
        return NextResponse.json({ error: 'Each item must have a valid description.' }, { status: 400, headers: JSON_HEADERS });
      }

      const quantity = Number(item.qty ?? item.quantity);
      const unitCost = Number(item.unit_cost ?? 0);
      const unit = typeof item.unit === 'string' && item.unit.trim() ? item.unit.trim() : 'pcs';
      if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_QTY) {
        return NextResponse.json({ error: 'Item quantity must be a whole number between 1 and 1,000,000.' }, { status: 400, headers: JSON_HEADERS });
      }
      if (!Number.isFinite(unitCost) || unitCost < 0 || unitCost > MAX_UNIT_COST) {
        return NextResponse.json({ error: 'Item unit cost must be a valid amount.' }, { status: 400, headers: JSON_HEADERS });
      }

      const totalCost = quantity * unitCost;
      if (!Number.isFinite(totalCost) || totalCost > MAX_TOTAL) {
        return NextResponse.json({ error: 'Item subtotal exceeds the permitted amount.' }, { status: 400, headers: JSON_HEADERS });
      }
      sanitizedItems.push({
        item_description: descriptionValue.trim(),
        quantity,
        unit,
        unit_cost: unitCost,
        total_cost: totalCost,
      });
    }

    const validationMessage = firstValidationError(validatePurchaseRequest({
      purpose,
      department,
      section: section || '',
      requestedBy: printedName,
      designation: designation || '',
      items: sanitizedItems.map(item => ({
        description: item.item_description,
        qty: item.quantity,
        unit: item.unit,
        unit_cost: item.unit_cost,
      })),
    }));
    if (validationMessage) {
      return NextResponse.json({ error: validationMessage }, { status: 400, headers: JSON_HEADERS });
    }

    const calculatedTotal = sanitizedItems.reduce((acc, item) => acc + item.total_cost, 0);
    if (!Number.isFinite(calculatedTotal) || calculatedTotal > MAX_TOTAL) {
      return NextResponse.json({ error: 'Purchase Request total exceeds the permitted amount.' }, { status: 400, headers: JSON_HEADERS });
    }

    // Preserve the existing temporary-number format and retry behavior while
    // making the PR, its items, and initial history atomic in Postgres.
    const { data: allPrs, error: listError } = await admin
      .from('purchase_requests')
      .select('pr_no')
      .order('created_at', { ascending: false });

    if (listError) {
      console.error('[PR Create API] PR sequence lookup failed:', listError.message);
      return NextResponse.json({ error: 'Unable to prepare a Purchase Request number. Please retry.' }, { status: 500, headers: JSON_HEADERS });
    }

    let maxExistingSeq = 0;
    const currentYear = new Date().getFullYear();
    for (const row of allPrs || []) {
      if (!row.pr_no) continue;
      const temporaryMatch = row.pr_no.match(/PR-TEMP-\d{4}-(\d+)/i);
      const officialMatch = row.pr_no.match(/PR-\d{4}-(\d+)/);
      const match = temporaryMatch || officialMatch;
      if (match) maxExistingSeq = Math.max(maxExistingSeq, Number.parseInt(match[1], 10));
    }

    let targetSeq = maxExistingSeq + 1;
    let result: any = null;
    let lastError: any = null;

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const candidatePrNo = 'PR-TEMP-' + currentYear + '-' + String(targetSeq).padStart(4, '0');
      const requestPayload = {
        pr_no: candidatePrNo,
        user_id: user.id,
        department,
        section,
        purpose,
        total: calculatedTotal,
        printed_name: printedName,
        designation,
        pr_date: new Date().toISOString().split('T')[0],
      };

      const { data, error } = await admin.rpc('create_purchase_request_with_items', {
        p_request: requestPayload,
        p_items: sanitizedItems,
      });

      if (!error && data?.pr) {
        result = data;
        break;
      }

      lastError = error;
      if (error?.code === '23505') {
        targetSeq += 1;
        continue;
      }
      break;
    }

    if (!result) {
      console.error('[PR Create API] Atomic PR creation failed:', lastError?.message || 'No result');
      return NextResponse.json({ error: 'Failed to save the complete Purchase Request. Please retry.' }, { status: 500, headers: JSON_HEADERS });
    }

    await admin.auth.admin.updateUserById(user.id, {
      user_metadata: { full_name: printedName },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      pr: result.pr,
      is_temporary: true,
      items: result.items || [],
    }, { status: 201, headers: JSON_HEADERS });
  } catch (error) {
    console.error('[PR Create API] Unexpected exception:', error);
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500, headers: JSON_HEADERS });
  }
}
