import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";

function getAdminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseAdminClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function authorizeAdmin() {
  const authClient = await createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return { user: null, db: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const db = getAdminDb();
  if (!db) return { user: null, db: null, response: NextResponse.json({ error: "Server configuration error." }, { status: 500 }) };

  const { data: profile, error } = await db.from("users").select("role,is_active,status").eq("id", user.id).maybeSingle();
  if (error || !profile || profile.role !== "admin" || profile.is_active === false || profile.status !== "approved") {
    return { user: null, db: null, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { user, db, response: null };
}

export async function GET() {
  try {
    const auth = await authorizeAdmin();
    if (auth.response) return auth.response;

    const { data, error } = await auth.db!.from("users")
      .select("id,email,full_name,role,department,college,is_active,status,created_at,updated_at")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: "Unable to load user accounts." }, { status: 500 });
    return NextResponse.json({ users: data || [] });
  } catch (error) {
    console.error("[admin/users] GET failed:", error);
    return NextResponse.json({ error: "Unable to load user accounts." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authorizeAdmin();
    if (auth.response) return auth.response;

    const body = await request.json();
    const userId = typeof body?.userId === "string" ? body.userId : "";
    const status = body?.status;
    if (!userId || !["approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "A valid user and approval status are required." }, { status: 400 });
    }

    if (userId === auth.user!.id) {
      return NextResponse.json({ error: "The administrator account cannot be changed through this endpoint." }, { status: 400 });
    }

    const { data: target, error: targetError } = await auth.db!.from("users").select("id,role,status").eq("id", userId).maybeSingle();
    if (targetError || !target) return NextResponse.json({ error: "User account not found." }, { status: 404 });
    if (target.role === "admin") return NextResponse.json({ error: "Administrative accounts cannot be approved or rejected here." }, { status: 403 });

    const { data, error } = await auth.db!.from("users")
      .update({ status, is_active: status === "approved", updated_at: new Date().toISOString() })
      .eq("id", userId)
      .select("id,email,full_name,role,department,college,is_active,status,created_at,updated_at")
      .single();

    if (error) return NextResponse.json({ error: "Unable to update the account status." }, { status: 500 });
    return NextResponse.json({ user: data });
  } catch (error) {
    console.error("[admin/users] PATCH failed:", error);
    return NextResponse.json({ error: "Unable to update the account status." }, { status: 500 });
  }
}
