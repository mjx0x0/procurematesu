import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const GENERATION_STAGE = "rfq_generation";

function normalizePrNo(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function requireActiveAdmin() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      supabase,
      user: null,
      response: NextResponse.json({ error: "Authentication required." }, { status: 401 }),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("role,status,is_active")
    .eq("id", user.id)
    .single();

  if (
    profileError ||
    !profile ||
    profile.role !== "admin" ||
    profile.status !== "approved" ||
    profile.is_active !== true
  ) {
    return {
      supabase,
      user: null,
      response: NextResponse.json({ error: "Administrator access required." }, { status: 403 }),
    };
  }

  return { supabase, user, response: null };
}

export async function GET(request: Request) {
  const { supabase, response } = await requireActiveAdmin();
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const prNo = normalizePrNo(searchParams.get("prNo"));
  if (!prNo) {
    return NextResponse.json({ error: "Purchase Request number is required." }, { status: 400 });
  }

  const { data: rfq, error: rfqError } = await supabase
    .from("rfqs")
    .select("id,pr_no,template_type,reference_no,project_name,location,rfq_date,generated_by,created_at,updated_at")
    .eq("pr_no", prNo)
    .single();

  if (rfqError || !rfq) {
    return NextResponse.json({ error: "No generated RFQ was found for this Purchase Request." }, { status: 404 });
  }

  const { data: pr, error: prError } = await supabase
    .from("purchase_requests")
    .select("pr_no,purpose,total,current_stage,department,section,pr_date,created_at")
    .eq("pr_no", prNo)
    .single();

  if (prError || !pr) {
    return NextResponse.json({ error: "Purchase Request not found." }, { status: 404 });
  }

  const { data: items, error: itemsError } = await supabase
    .from("pr_items")
    .select("id,item_description,quantity,unit,unit_cost,total_cost")
    .eq("pr_no", prNo)
    .order("created_at", { ascending: true });

  if (itemsError) {
    return NextResponse.json({ error: "Unable to load Purchase Request items." }, { status: 500 });
  }

  return NextResponse.json({ rfq, pr, items: items || [] });
}

export async function POST(request: Request) {
  const { supabase, user, response } = await requireActiveAdmin();
  if (response) return response;
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  let body: { prNo?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const prNo = normalizePrNo(body.prNo);
  if (!prNo || prNo.length > 100) {
    return NextResponse.json({ error: "A valid Purchase Request number is required." }, { status: 400 });
  }

  const { data: pr, error: prError } = await supabase
    .from("purchase_requests")
    .select("pr_no,purpose,total,current_stage,department,section,pr_date,created_at")
    .eq("pr_no", prNo)
    .single();

  if (prError || !pr) {
    return NextResponse.json({ error: "Purchase Request not found." }, { status: 404 });
  }

  if (pr.current_stage !== GENERATION_STAGE) {
    return NextResponse.json(
      { error: "RFQ generation is only available while this Purchase Request is at Step 7: Generation of Requests for Quotations (RFQs)." },
      { status: 409 }
    );
  }

  const { data: items, error: itemsError } = await supabase
    .from("pr_items")
    .select("id,item_description,quantity,unit,unit_cost,total_cost")
    .eq("pr_no", prNo)
    .order("created_at", { ascending: true });

  if (itemsError || !items?.length) {
    return NextResponse.json(
      { error: "The Purchase Request has no recorded item lines. RFQ generation cannot continue." },
      { status: 409 }
    );
  }

  const total = Number(pr.total || 0);
  const templateType = total < 50000 ? "less_than_50k" : "more_than_50k";

  const { data: existing } = await supabase
    .from("rfqs")
    .select("id,pr_no,template_type,reference_no,project_name,location,rfq_date,generated_by,created_at,updated_at")
    .eq("pr_no", prNo)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ rfq: existing, pr, items, alreadyExists: true });
  }

  const { data: rfq, error: insertError } = await supabase
    .from("rfqs")
    .insert({
      pr_no: pr.pr_no,
      template_type: templateType,
      reference_no: pr.pr_no,
      project_name: pr.purpose,
      location: "",
      generated_by: user.id,
    })
    .select("id,pr_no,template_type,reference_no,project_name,location,rfq_date,generated_by,created_at,updated_at")
    .single();

  if (insertError || !rfq) {
    console.error("RFQ generation insert failed:", insertError);
    return NextResponse.json({ error: "Unable to create the RFQ record." }, { status: 500 });
  }

  return NextResponse.json({ rfq, pr, items, alreadyExists: false }, { status: 201 });
}
