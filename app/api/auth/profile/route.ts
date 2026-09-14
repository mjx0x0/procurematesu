import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const body = await request.json().catch(() => ({}));
    const token =
      body?.accessToken ||
      (authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null);

    if (!token) {
      return NextResponse.json({ error: "No authentication token provided" }, { status: 401 });
    }

    const admin = getAdminClient();
    if (!admin) {
      return NextResponse.json({ error: "Database service unavailable" }, { status: 500 });
    }

    // Verify token against Supabase Auth
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) {
      return NextResponse.json({ error: "Invalid authentication session" }, { status: 401 });
    }

    const authUser = authData.user;
    const email = authUser.email?.toLowerCase() || "";

    // Lookup profile in public.users
    let { data: profile, error: profileError } = await admin
      .from("users")
      .select("id, email, full_name, role, is_active, status, department")
      .eq("id", authUser.id)
      .maybeSingle();

    // If not found by ID, try looking up by email (handles cases where auth ID might have drifted)
    if (!profile && email) {
      const { data: profileByEmail } = await admin
        .from("users")
        .select("id, email, full_name, role, is_active, status, department")
        .eq("email", email)
        .maybeSingle();

      if (profileByEmail) {
        // Update the public.users record to match the current auth.users ID
        await admin
          .from("users")
          .update({ id: authUser.id, updated_at: new Date().toISOString() })
          .eq("email", email);
        profile = { ...profileByEmail, id: authUser.id };
      }
    }

    // If profile still does not exist, but user is authenticated with a valid @msugensan.edu.ph account,
    // auto-provision them so existing university members are never locked out
    if (!profile && email.endsWith("@msugensan.edu.ph")) {
      const fullName =
        authUser.user_metadata?.full_name ||
        email.split("@")[0].replace(".", " ");

      const newRecord = {
        id: authUser.id,
        email,
        full_name: fullName,
        role: email.includes("admin") || email.includes("procurement") ? "admin" : "end_user",
        is_active: true,
        status: "approved",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: inserted, error: insertError } = await admin
        .from("users")
        .upsert(newRecord, { onConflict: "id" })
        .select()
        .single();

      if (!insertError && inserted) {
        profile = inserted;
      }
    }

    if (!profile) {
      return NextResponse.json({ profile: null }, { status: 404 });
    }

    return NextResponse.json({ profile }, { status: 200 });
  } catch (error) {
    console.error("[api/auth/profile] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
