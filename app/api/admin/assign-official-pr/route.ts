import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const JSON_HEADERS = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return NextResponse.json({ error: "Content-Type must be application/json." }, { status: 415, headers: JSON_HEADERS });
    }

    const origin = req.headers.get("origin");
    const forwardedHost = req.headers.get("x-forwarded-host");
    const host = forwardedHost || req.headers.get("host");
    if (origin && host) {
      try {
        const originHost = new URL(origin).host;
        const cleanHost = host.split(":")[0];
        const cleanOriginHost = originHost.split(":")[0];
        if (originHost !== host && cleanHost !== cleanOriginHost && !cleanHost.includes("localhost") && !cleanOriginHost.includes("googleusercontent.com")) {
          return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers: JSON_HEADERS });
        }
      } catch {
        return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers: JSON_HEADERS });
      }
    }

    const body = await req.json();
    const currentPrNo = typeof body?.currentPrNo === "string" ? body.currentPrNo.trim() : "";
    let rawOfficialPrNo = typeof body?.officialPrNo === "string" ? body.officialPrNo.trim() : "";
    const adminRemarks = typeof body?.remarks === "string" ? body.remarks.trim() : "";

    if (!currentPrNo) {
      return NextResponse.json({ error: "Current PR number is required." }, { status: 400, headers: JSON_HEADERS });
    }

    if (!rawOfficialPrNo) {
      return NextResponse.json({ error: "Official PR number is required." }, { status: 400, headers: JSON_HEADERS });
    }

    // Auto-prefix PR- if omitted by user
    if (!rawOfficialPrNo.toUpperCase().startsWith("PR-")) {
      rawOfficialPrNo = `PR-${rawOfficialPrNo}`;
    }
    const officialPrNo = rawOfficialPrNo.toUpperCase();

    if (officialPrNo.includes("TEMP")) {
      return NextResponse.json({ error: "The official PR number cannot contain 'TEMP'. Please enter a permanent university PR control number." }, { status: 400, headers: JSON_HEADERS });
    }

    if (!/^PR-[A-Z0-9-]{3,40}$/i.test(officialPrNo)) {
      return NextResponse.json({ error: "Invalid official PR number format. Example format: PR-2026-0001." }, { status: 400, headers: JSON_HEADERS });
    }

    if (officialPrNo === currentPrNo.toUpperCase()) {
      return NextResponse.json({ error: "The official PR number is identical to the current PR number." }, { status: 400, headers: JSON_HEADERS });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401, headers: JSON_HEADERS });
    }

    const { data: profile, error: profileError } = await supabase.from("users").select("role, status, is_active").eq("id", user.id).single();
    if (profileError || profile?.role !== "admin" || profile?.status !== "approved" || profile?.is_active !== true) {
      return NextResponse.json({ error: "Administrator access required." }, { status: 403, headers: JSON_HEADERS });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json({ error: "Server configuration error." }, { status: 500, headers: JSON_HEADERS });
    }

    const db = createSupabaseAdminClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

    // Verify current PR exists
    const { data: existingPR, error: prLookupError } = await db.from("purchase_requests").select("*").eq("pr_no", currentPrNo).single();
    if (prLookupError || !existingPR) {
      return NextResponse.json({ error: `Purchase request ${currentPrNo} not found.` }, { status: 404, headers: JSON_HEADERS });
    }

    // Verify candidate official PR number is not already taken
    const { data: conflictPR } = await db.from("purchase_requests").select("pr_no").eq("pr_no", officialPrNo).maybeSingle();
    if (conflictPR) {
      return NextResponse.json({ error: `Official PR number '${officialPrNo}' is already assigned to another request.` }, { status: 409, headers: JSON_HEADERS });
    }

    const now = new Date().toISOString();

    // Perform atomic transition from temporary PR number to official PR number:
    // Step 1: Insert clone with official PR number
    const newPrRow = {
      ...existingPR,
      pr_no: officialPrNo,
      updated_at: now,
    };
    const { error: insertNewError } = await db.from("purchase_requests").insert(newPrRow);
    if (insertNewError) {
      console.error("[assign-official-pr] Insert clone failed:", insertNewError);
      return NextResponse.json({ error: `Failed to create official PR record: ${insertNewError.message}` }, { status: 500, headers: JSON_HEADERS });
    }

    // Step 2: Migrate child items
    const { error: updateItemsError } = await db.from("pr_items").update({ pr_no: officialPrNo }).eq("pr_no", currentPrNo);
    if (updateItemsError) {
      console.error("[assign-official-pr] Update items failed:", updateItemsError);
      await db.from("purchase_requests").delete().eq("pr_no", officialPrNo);
      return NextResponse.json({ error: "Failed to update PR items to official number." }, { status: 500, headers: JSON_HEADERS });
    }

    // Step 3: Migrate child stage history
    const { error: updateStagesError } = await db.from("pr_stages_completed").update({ pr_no: officialPrNo }).eq("pr_no", currentPrNo);
    if (updateStagesError) {
      console.error("[assign-official-pr] Update stage history failed:", updateStagesError);
      // rollback items
      await db.from("pr_items").update({ pr_no: currentPrNo }).eq("pr_no", officialPrNo);
      await db.from("purchase_requests").delete().eq("pr_no", officialPrNo);
      return NextResponse.json({ error: "Failed to update stage history to official number." }, { status: 500, headers: JSON_HEADERS });
    }

    // Step 4: Migrate RFQs if any exist
    await db.from("rfqs").update({ pr_no: officialPrNo, reference_no: officialPrNo }).eq("pr_no", currentPrNo);

    // Step 5: Delete old temporary PR record
    const { error: deleteOldError } = await db.from("purchase_requests").delete().eq("pr_no", currentPrNo);
    if (deleteOldError) {
      console.error("[assign-official-pr] Delete old record failed:", deleteOldError);
    }

    // Step 6: Record official pre-numbering event in stage history
    const logRemarks = `Official PR Control Number assigned: ${officialPrNo} (updated from ${currentPrNo}).${adminRemarks ? ` Note: ${adminRemarks}` : ""}`;
    await db.from("pr_stages_completed").insert({
      pr_no: officialPrNo,
      stage_key: "pr_pre_numbering",
      stage_name: "Pre-Numbering and Control of PRs — Control Number Assigned",
      status: "completed",
      completed_at: now,
      remarks: logRemarks,
      notes: logRemarks,
    });

    const [{ data: updatedPR }, { data: stageHistory }] = await Promise.all([
      db.from("purchase_requests").select("*").eq("pr_no", officialPrNo).single(),
      db.from("pr_stages_completed").select("stage_name, stage_key, completed_at, remarks, status").eq("pr_no", officialPrNo).order("completed_at", { ascending: true }),
    ]);

    return NextResponse.json({
      success: true,
      oldPrNo: currentPrNo,
      officialPrNo,
      updatedPR,
      stageHistory,
    }, { headers: JSON_HEADERS });
  } catch (error: any) {
    console.error("[assign-official-pr] Unexpected API error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error." }, { status: 500, headers: JSON_HEADERS });
  }
}
