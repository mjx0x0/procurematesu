import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const GENERATION_STAGE = "rfq_generation";
const TERMS = [
  "1. Mayor's/Business Permit",
  "2. Philgeps Registration Certificate",
  "3. Supplier/Bidder previously submitted documentary requirements may not submit.",
  "4. All entries shall be typed or written in a clear legible manner",
  "5. No alternate quotation/offer is allowed, suppliers who submitted more than one quotation shall be automatically disqualified.",
  "6. All prices offered herein are valid, binding and effective for THIRTY (30) calendar days upon issuance of this document. Alternate bids shall be rejected.",
  "7. Delivery period within fifteen (15) Calendar Days",
  "8. Price validity shall be for period of thirty (30) Calendar Days.",
  "9. Bidders shall submit original brochures showing certifications of the product being offered.",
  "10. In case suppliers pro forma quotation is submitted, conditions will be governed by the submitted signed Terms of Reference/Technical Specifications.",
  "11. Partial bid is allowed, evaluation, comparison and contract award shall be made PER ITEM; partial bid is not allowed; the goods are grouped in a single lot, evaluation, comparison, and contract award shall be made PER LOT",
] as const;

type RFQItem = {
  item: number;
  quantity: number;
  abc: number;
  technical_specifications: string;
  supplier_unit: string;
  supplier_unit_price: string;
  supplier_total_amount: string;
};

type RFQFormData = {
  reference_no: string;
  project_name: string;
  location: string;
  rfq_date: string;
  quotation_no: string;
  company_name: string;
  address: string;
  items: RFQItem[];
  purpose: string;
  office: string;
  total_abc: number;
  instructions: string;
  delivery_period: string;
  warranty: string;
  price_validity: string;
  bidder_name: string;
  bidder_contact: string;
  bidder_email: string;
  canvasser_name: string;
};

function normalizePrNo(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function numberValue(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function buildDefaultFormData(pr: any, items: any[], rfqDate?: string): RFQFormData {
  const mappedItems: RFQItem[] = (items || []).map((item: any, index: number) => ({
    item: index + 1,
    quantity: numberValue(item.quantity),
    abc: numberValue(item.total_cost) || numberValue(item.unit_cost) * numberValue(item.quantity),
    technical_specifications: String(item.item_description || ""),
    supplier_unit: String(item.unit || ""),
    supplier_unit_price: "",
    supplier_total_amount: "",
  }));

  const totalAbc = mappedItems.reduce((sum, item) => sum + numberValue(item.abc), 0) || numberValue(pr?.total);

  return {
    reference_no: String(pr?.pr_no || ""),
    project_name: String(pr?.purpose || ""),
    location: "",
    rfq_date: rfqDate || today(),
    quotation_no: "",
    company_name: "",
    address: "",
    items: mappedItems,
    purpose: String(pr?.purpose || ""),
    office: String(pr?.department || ""),
    total_abc: totalAbc,
    instructions: "See attached Specifications/important Instructions for items.",
    delivery_period: "",
    warranty: "",
    price_validity: "",
    bidder_name: "",
    bidder_contact: "",
    bidder_email: "",
    canvasser_name: "",
  };
}

function sanitizeFormData(input: any, fallback: RFQFormData): RFQFormData {
  const rawItems = Array.isArray(input?.items) ? input.items : fallback.items;
  const items: RFQItem[] = rawItems.slice(0, 100).map((item: any, index: number) => ({
    item: index + 1,
    quantity: Math.max(0, numberValue(item?.quantity)),
    abc: Math.max(0, numberValue(item?.abc)),
    technical_specifications: String(item?.technical_specifications ?? "").slice(0, 2000),
    supplier_unit: String(item?.supplier_unit ?? "").slice(0, 100),
    supplier_unit_price: String(item?.supplier_unit_price ?? "").slice(0, 100),
    supplier_total_amount: String(item?.supplier_total_amount ?? "").slice(0, 100),
  }));

  const totalAbc = items.reduce((sum, item) => sum + numberValue(item.abc), 0);

  return {
    reference_no: String(input?.reference_no ?? fallback.reference_no).slice(0, 150),
    project_name: String(input?.project_name ?? fallback.project_name).slice(0, 500),
    location: String(input?.location ?? fallback.location).slice(0, 300),
    rfq_date: String(input?.rfq_date ?? fallback.rfq_date).slice(0, 30),
    quotation_no: String(input?.quotation_no ?? fallback.quotation_no).slice(0, 150),
    company_name: String(input?.company_name ?? fallback.company_name).slice(0, 300),
    address: String(input?.address ?? fallback.address).slice(0, 500),
    items,
    purpose: String(input?.purpose ?? fallback.purpose).slice(0, 500),
    office: String(input?.office ?? fallback.office).slice(0, 300),
    total_abc: totalAbc,
    instructions: String(input?.instructions ?? fallback.instructions).slice(0, 1000),
    delivery_period: String(input?.delivery_period ?? fallback.delivery_period).slice(0, 200),
    warranty: String(input?.warranty ?? fallback.warranty).slice(0, 200),
    price_validity: String(input?.price_validity ?? fallback.price_validity).slice(0, 200),
    bidder_name: String(input?.bidder_name ?? fallback.bidder_name).slice(0, 300),
    bidder_contact: String(input?.bidder_contact ?? fallback.bidder_contact).slice(0, 150),
    bidder_email: String(input?.bidder_email ?? fallback.bidder_email).slice(0, 200),
    canvasser_name: String(input?.canvasser_name ?? fallback.canvasser_name).slice(0, 300),
  };
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

  if (profileError || !profile || profile.role !== "admin" || profile.status !== "approved" || profile.is_active !== true) {
    return {
      supabase,
      user: null,
      response: NextResponse.json({ error: "Administrator access required." }, { status: 403 }),
    };
  }

  return { supabase, user, response: null };
}

async function loadRFQBundle(supabase: any, prNo: string) {
  const { data: rfq, error: rfqError } = await supabase
    .from("rfqs")
    .select("id,pr_no,template_type,reference_no,project_name,location,rfq_date,generated_by,form_data,created_at,updated_at")
    .eq("pr_no", prNo)
    .single();

  if (rfqError || !rfq) return { error: "No generated RFQ was found for this Purchase Request.", status: 404 as const };

  const { data: pr, error: prError } = await supabase
    .from("purchase_requests")
    .select("pr_no,purpose,total,current_stage,department,section,pr_date,created_at")
    .eq("pr_no", prNo)
    .single();

  if (prError || !pr) return { error: "Purchase Request not found.", status: 404 as const };

  const { data: items, error: itemsError } = await supabase
    .from("pr_items")
    .select("id,item_description,quantity,unit,unit_cost,total_cost")
    .eq("pr_no", prNo)
    .order("created_at", { ascending: true });

  if (itemsError) return { error: "Unable to load Purchase Request items.", status: 500 as const };

  const fallback = buildDefaultFormData(pr, items || [], rfq.rfq_date);
  const formData = rfq.form_data ? sanitizeFormData(rfq.form_data, fallback) : fallback;
  return { rfq, pr, items: items || [], formData };
}

export async function GET(request: Request) {
  const { supabase, response } = await requireActiveAdmin();
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const prNo = normalizePrNo(searchParams.get("prNo"));
  if (!prNo) return NextResponse.json({ error: "Purchase Request number is required." }, { status: 400 });

  const bundle = await loadRFQBundle(supabase, prNo);
  if ("error" in bundle) return NextResponse.json({ error: bundle.error }, { status: bundle.status });
  return NextResponse.json(bundle);
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
  if (!prNo || prNo.length > 100) return NextResponse.json({ error: "A valid Purchase Request number is required." }, { status: 400 });

  const { data: pr, error: prError } = await supabase
    .from("purchase_requests")
    .select("pr_no,purpose,total,current_stage,department,section,pr_date,created_at")
    .eq("pr_no", prNo)
    .single();

  if (prError || !pr) return NextResponse.json({ error: "Purchase Request not found." }, { status: 404 });

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
    return NextResponse.json({ error: "The Purchase Request has no recorded item lines. RFQ generation cannot continue." }, { status: 409 });
  }

  const fallback = buildDefaultFormData(pr, items);
  const total = Number(pr.total || fallback.total_abc);
  const templateType = total < 50000 ? "less_than_50k" : "more_than_50k";

  const { data: existing } = await supabase
    .from("rfqs")
    .select("id,pr_no,template_type,reference_no,project_name,location,rfq_date,generated_by,form_data,created_at,updated_at")
    .eq("pr_no", prNo)
    .maybeSingle();

  if (existing) {
    const formData = existing.form_data ? sanitizeFormData(existing.form_data, buildDefaultFormData(pr, items, existing.rfq_date)) : buildDefaultFormData(pr, items, existing.rfq_date);
    return NextResponse.json({ rfq: { ...existing, form_data: formData }, pr, items, formData, alreadyExists: true });
  }

  const { data: rfq, error: insertError } = await supabase
    .from("rfqs")
    .insert({
      pr_no: pr.pr_no,
      template_type: templateType,
      reference_no: fallback.reference_no,
      project_name: fallback.project_name,
      location: fallback.location,
      rfq_date: fallback.rfq_date,
      generated_by: user.id,
      form_data: fallback,
    })
    .select("id,pr_no,template_type,reference_no,project_name,location,rfq_date,generated_by,form_data,created_at,updated_at")
    .single();

  if (insertError || !rfq) {
    console.error("RFQ generation insert failed:", insertError);
    return NextResponse.json({ error: "Unable to create the RFQ record." }, { status: 500 });
  }

  return NextResponse.json({ rfq, pr, items, formData: fallback, alreadyExists: false }, { status: 201 });
}

export async function PATCH(request: Request) {
  const { supabase, response } = await requireActiveAdmin();
  if (response) return response;

  let body: { prNo?: unknown; formData?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const prNo = normalizePrNo(body.prNo);
  if (!prNo || prNo.length > 100 || !body.formData || typeof body.formData !== "object") {
    return NextResponse.json({ error: "A valid Purchase Request number and RFQ form data are required." }, { status: 400 });
  }

  const bundle = await loadRFQBundle(supabase, prNo);
  if ("error" in bundle) return NextResponse.json({ error: bundle.error }, { status: bundle.status });

  const formData = sanitizeFormData(body.formData, bundle.formData);
  if (!formData.items.length) return NextResponse.json({ error: "At least one RFQ item is required." }, { status: 400 });

  const templateType = formData.total_abc < 50000 ? "less_than_50k" : "more_than_50k";

  const { data: updated, error: updateError } = await supabase
    .from("rfqs")
    .update({
      template_type: templateType,
      reference_no: formData.reference_no,
      project_name: formData.project_name,
      location: formData.location,
      rfq_date: formData.rfq_date || today(),
      form_data: formData,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bundle.rfq.id)
    .select("id,pr_no,template_type,reference_no,project_name,location,rfq_date,generated_by,form_data,created_at,updated_at")
    .single();

  if (updateError || !updated) {
    console.error("RFQ update failed:", updateError);
    return NextResponse.json({ error: "Unable to save the RFQ corrections." }, { status: 500 });
  }

  return NextResponse.json({ rfq: updated, formData });
}

export { TERMS };
