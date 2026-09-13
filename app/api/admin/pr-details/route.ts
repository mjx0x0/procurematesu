import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  const { data: profile } = await supabase.from("users").select("role,status,is_active").eq("id", user.id).single();
  if (profile?.role !== "admin" || profile.status !== "approved" || profile.is_active !== true) {
    return { supabase, response: NextResponse.json({ error: "Administrator access required." }, { status: 403 }) };
  }
  return { supabase, response: null };
}

export async function GET(request: Request) {
  const { supabase, response } = await requireAdmin();
  if (response) return response;
  const prNo = (new URL(request.url).searchParams.get("prNo") || "").trim();
  if (!prNo) return NextResponse.json({ error: "Purchase Request number is required." }, { status: 400 });

  const { data: pr, error: prError } = await supabase.from("purchase_requests").select("*").eq("pr_no", prNo).single();
  if (prError || !pr) return NextResponse.json({ error: "Purchase Request not found." }, { status: 404 });

  const { data: items, error: itemsError } = await supabase.from("pr_items").select("*").eq("pr_no", prNo).order("created_at", { ascending: true });
  if (itemsError) return NextResponse.json({ error: "Unable to load Purchase Request items." }, { status: 500 });

  const { data: history } = await supabase.from("pr_stages_completed").select("stage_name,stage_key,completed_at,remarks,status").eq("pr_no", prNo).order("completed_at", { ascending: true });
  return NextResponse.json({ pr, items: items || [], history: history || [] }, { headers: { "Cache-Control": "no-store" } });
}
