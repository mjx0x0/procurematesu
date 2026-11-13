import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";

export async function DELETE(request: NextRequest) {
  try {
    const authClient = await createServerClient();
    let { data: { user } } = await authClient.auth.getUser();

    const authorization = request.headers.get("authorization");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: "Server configuration is incomplete." }, { status: 500 });
    }

    const adminClient = createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    if (authorization?.startsWith("Bearer ")) {
      const { data } = await adminClient.auth.getUser(authorization.slice(7).trim());
      user = data.user || user;
    }
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: profile, error: profileError } = await adminClient
      .from("users")
      .select("role,is_active")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError || profile?.role !== "admin" || profile.is_active === false) {
      return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const inquiryId = typeof body?.id === "string" ? body.id.trim() : "";
    if (!inquiryId) return NextResponse.json({ error: "A log ID is required." }, { status: 400 });

    const { data: deleted, error } = await adminClient
      .from("monitor_inquiries")
      .delete()
      .eq("id", inquiryId)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("[admin/inquiries] Delete failed:", error);
      return NextResponse.json({ error: "Unable to delete this helpdesk log." }, { status: 500 });
    }
    if (!deleted) return NextResponse.json({ error: "This helpdesk log was not found or was already deleted." }, { status: 404 });

    return NextResponse.json({ success: true, id: deleted.id });
  } catch (error) {
    console.error("[admin/inquiries] Unexpected delete error:", error);
    return NextResponse.json({ error: "Unable to delete this helpdesk log." }, { status: 500 });
  }
}
