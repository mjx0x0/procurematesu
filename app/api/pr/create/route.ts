import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

interface SanitizedItem {
  item_description: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  total_cost: number;
}

const JSON_HEADERS = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return NextResponse.json(
        { error: "Content-Type must be application/json." },
        { status: 415, headers: JSON_HEADERS }
      );
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json(
        { error: "Server configuration error: database credentials not available." },
        { status: 500, headers: JSON_HEADERS }
      );
    }

    const admin = createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let user = null;

    // 1. Try Bearer token from Authorization header
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7).trim();
      if (token) {
        const { data: tokenUserData } = await admin.auth.getUser(token);
        if (tokenUserData?.user) {
          user = tokenUserData.user;
        }
      }
    }

    // 2. Fall back to cookies session
    if (!user) {
      try {
        const supabase = await createClient();
        const { data: cookieUserData } = await supabase.auth.getUser();
        if (cookieUserData?.user) {
          user = cookieUserData.user;
        }
      } catch {
        // Ignore cookie parsing issues
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in again." },
        { status: 401, headers: JSON_HEADERS }
      );
    }

    const body = await req.json();

    const department = typeof body?.department === "string" ? body.department.trim() : "";
    const section = typeof body?.section === "string" && body.section.trim() ? body.section.trim() : null;
    const purpose = typeof body?.purpose === "string" ? body.purpose.trim() : "";
    let printedName = typeof body?.printed_name === "string" ? body.printed_name.trim() : "";
    const designation = typeof body?.designation === "string" && body.designation.trim() ? body.designation.trim() : null;
    const rawItems = Array.isArray(body?.items) ? body.items : [];

    if (!printedName) {
      printedName = (user.user_metadata?.full_name || "").trim();
    }

    if (!department) {
      return NextResponse.json(
        { error: "Please enter your department." },
        { status: 400, headers: JSON_HEADERS }
      );
    }

    if (!purpose) {
      return NextResponse.json(
        { error: "Please enter the purpose for this purchase request." },
        { status: 400, headers: JSON_HEADERS }
      );
    }

    if (!printedName || printedName.includes("@")) {
      return NextResponse.json(
        { error: "Please provide your actual full name in the Requested By field, not an email address." },
        { status: 400, headers: JSON_HEADERS }
      );
    }

    // Sanitize item rows
    const sanitizedItems: SanitizedItem[] = rawItems
      .filter((item: any) => item && typeof (item.description || item.item_description) === "string" && (item.description || item.item_description).trim())
      .map((item: any): SanitizedItem => {
        const desc = (item.description || item.item_description).trim();
        const qty = Math.max(1, Number(item.qty || item.quantity) || 1);
        const unit = typeof item.unit === "string" && item.unit.trim() ? item.unit.trim() : "pcs";
        const unitCost = Math.max(0, Number(item.unit_cost) || 0);
        const totalCost = Number(item.total_cost) > 0 ? Number(item.total_cost) : qty * unitCost;

        return {
          item_description: desc,
          quantity: qty,
          unit,
          unit_cost: unitCost,
          total_cost: totalCost,
        };
      });

    if (sanitizedItems.length === 0) {
      return NextResponse.json(
        { error: "Please add at least one valid item with a description." },
        { status: 400, headers: JSON_HEADERS }
      );
    }

    const calculatedTotal = sanitizedItems.reduce((acc: number, curr: SanitizedItem) => acc + curr.total_cost, 0);
    const totalAmount = Number(body?.total || body?.total_amount) > 0 ? Number(body?.total || body?.total_amount) : calculatedTotal;

    // 1. Determine the maximum sequence across all purchase requests in the entire university
    const { data: allPrs } = await admin
      .from("purchase_requests")
      .select("pr_no")
      .order("created_at", { ascending: false });

    let maxExistingSeq = 0;
    const currentYear = new Date().getFullYear();

    for (const row of allPrs || []) {
      if (row.pr_no) {
        const match = row.pr_no.match(/PR-\d{4}-(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxExistingSeq) maxExistingSeq = num;
        }
      }
    }

    // 2. Try calling RPC generate_purchase_request_number
    let rpcSeq = 0;
    try {
      const { data: rpcNo } = await admin.rpc("generate_purchase_request_number");
      if (rpcNo && typeof rpcNo === "string") {
        const match = rpcNo.match(/PR-\d{4}-(\d+)/);
        if (match) {
          rpcSeq = parseInt(match[1], 10);
        }
      }
    } catch {
      // Ignored if RPC fails or is unavailable
    }

    // Ensure next sequence is strictly greater than all existing PRs
    let targetSeq = Math.max(maxExistingSeq + 1, rpcSeq);
    if (targetSeq <= maxExistingSeq) {
      targetSeq = maxExistingSeq + 1;
    }

    // 3. Collision-resistant insert loop (up to 5 attempts)
    let createdPR: any = null;
    let lastError: any = null;

    for (let attempt = 0; attempt < 5; attempt++) {
      const candidatePrNo = `PR-${currentYear}-${String(targetSeq).padStart(4, "0")}`;

      const { data: insertData, error: insertError } = await admin
        .from("purchase_requests")
        .insert({
          pr_no: candidatePrNo,
          user_id: user.id,
          department,
          section,
          purpose,
          total: totalAmount,
          printed_name: printedName,
          designation,
          current_stage: "draft",
          pr_date: new Date().toISOString().split("T")[0],
          sai_no: null,
          alobs_no: null,
        })
        .select()
        .single();

      if (!insertError && insertData) {
        createdPR = insertData;
        break;
      }

      lastError = insertError;
      if (insertError?.code === "23505") {
        // Unique key violation on purchase_requests_pkey - increment and retry immediately
        console.warn(`[PR Create API] Collision on ${candidatePrNo}, retrying with next number...`);
        targetSeq++;
        continue;
      } else {
        // Other error (e.g. schema/constraint)
        break;
      }
    }

    if (!createdPR) {
      console.error("[PR Create API] PR creation failed:", lastError);
      return NextResponse.json(
        { error: lastError?.message || "Failed to create the purchase request." },
        { status: 500, headers: JSON_HEADERS }
      );
    }

    // 4. Insert items
    const itemsToInsert = sanitizedItems.map((item: SanitizedItem) => ({
      pr_no: createdPR.pr_no,
      item_description: item.item_description,
      quantity: item.quantity,
      unit: item.unit,
      unit_cost: item.unit_cost,
      total_cost: item.total_cost,
    }));

    const { data: insertedItems, error: itemsError } = await admin
      .from("pr_items")
      .insert(itemsToInsert)
      .select();

    if (itemsError) {
      console.error("[PR Create API] Items insertion failed:", itemsError);
    }

    // 5. Ensure initial workflow stage is recorded
    const { data: existingStage } = await admin
      .from("pr_stages_completed")
      .select("id")
      .eq("pr_no", createdPR.pr_no)
      .limit(1);

    if (!existingStage || existingStage.length === 0) {
      await admin.from("pr_stages_completed").insert({
        pr_no: createdPR.pr_no,
        stage_key: "receipt_of_pr",
        stage_name: "Receipt of Purchase Request (PR)",
        status: "completed",
        completed_at: new Date().toISOString(),
        remarks: "Purchase Request received from the end-user unit.",
        notes: "Purchase Request received from the end-user unit.",
      });
    }

    // Update user metadata in background to retain full name
    await admin.auth.admin
      .updateUserById(user.id, {
        user_metadata: { full_name: printedName },
      })
      .catch(() => {});

    return NextResponse.json(
      {
        success: true,
        pr: createdPR,
        items: insertedItems || itemsToInsert,
      },
      { status: 201, headers: JSON_HEADERS }
    );
  } catch (err: any) {
    console.error("[PR Create API] Unexpected exception:", err);
    return NextResponse.json(
      { error: err?.message || "An unexpected server error occurred." },
      { status: 500, headers: JSON_HEADERS }
    );
  }
}
