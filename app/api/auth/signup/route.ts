import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const EMAIL_PATTERN = /^[^\s@]+@msugensan\.edu\.ph$/i;

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

function mapAuthError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("email") && normalized.includes("already")) {
    return "This email address already exists. Please sign in instead.";
  }
  if (normalized.includes("password")) return message;
  return "Unable to create the account. Please try again.";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!fullName || !email || !password) {
      return NextResponse.json({ error: "Please fill in all fields." }, { status: 400 });
    }
    if (fullName.length < 2) {
      return NextResponse.json({ error: "Please enter your complete name." }, { status: 400 });
    }
    if (!EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ error: "Only @msugensan.edu.ph institutional email addresses are allowed." }, { status: 400 });
    }
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      return NextResponse.json({ error: "Password must be at least 8 characters and include uppercase, lowercase, and a number." }, { status: 400 });
    }

    const admin = getAdminClient();
    if (!admin) {
      console.error("[auth/signup] Supabase environment variables are not configured.");
      return NextResponse.json({ error: "Account registration is temporarily unavailable." }, { status: 500 });
    }

    const { data: profile, error: profileError } = await admin
      .from("users")
      .select("id,status,role")
      .eq("email", email)
      .maybeSingle();

    if (profileError) {
      console.error("[auth/signup] profile lookup failed:", profileError);
      return NextResponse.json({ error: "Unable to verify the account information. Please try again." }, { status: 500 });
    }

    if (profile && profile.role !== "end_user") {
      return NextResponse.json({ error: "This email address is already registered." }, { status: 409 });
    }
    if (profile && profile.status !== "rejected") {
      return NextResponse.json({ error: "This email address already exists. Please sign in instead." }, { status: 409 });
    }

    // Rejected accounts can register again. Reuse the existing Auth identity,
    // mark the email as confirmed, and return the application profile to pending.
    if (profile?.status === "rejected") {
      const { data: existingAuth, error: existingAuthError } = await admin.auth.admin.getUserById(profile.id);
      if (existingAuthError || !existingAuth.user) {
        console.error("[auth/signup] rejected account Auth lookup failed:", existingAuthError);
        return NextResponse.json({ error: "This account needs administrator assistance before it can be registered again." }, { status: 409 });
      }

      const { error: authUpdateError } = await admin.auth.admin.updateUserById(profile.id, {
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (authUpdateError) {
        console.error("[auth/signup] rejected account reset failed:", authUpdateError);
        return NextResponse.json({ error: mapAuthError(authUpdateError.message) }, { status: 500 });
      }

      const { error: profileUpdateError } = await admin
        .from("users")
        .update({ email, full_name: fullName, role: "end_user", is_active: false, status: "pending", updated_at: new Date().toISOString() })
        .eq("id", profile.id);
      if (profileUpdateError) {
        console.error("[auth/signup] rejected profile reset failed:", profileUpdateError);
        return NextResponse.json({ error: "Unable to restart the account registration. Please try again." }, { status: 500 });
      }

      return NextResponse.json({ ok: true, approvalRequired: true, reactivated: true });
    }

    // Check Auth directly as well so an orphaned Auth identity cannot create a duplicate.
    const { data: authList, error: authListError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (authListError) {
      console.error("[auth/signup] Auth duplicate lookup failed:", authListError);
      return NextResponse.json({ error: "Unable to verify whether the email address already exists." }, { status: 500 });
    }
    const existingAuth = authList.users.find((user) => user.email?.toLowerCase() === email);
    if (existingAuth) {
      return NextResponse.json({ error: "This email address already exists. Please sign in instead." }, { status: 409 });
    }

    // Email confirmation is intentionally not part of ProcuremateSU account creation.
    // The account is confirmed at the Auth layer but remains inaccessible because
    // the public.users profile starts as pending/inactive and login checks that state.
    const { data, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createError || !data.user) {
      console.error("[auth/signup] Supabase createUser failed:", createError);
      return NextResponse.json({ error: mapAuthError(createError?.message || "Unable to create user") }, { status: 400 });
    }

    // The database trigger creates the pending public.users profile. Update it
    // explicitly as well so registration remains correct even if profile defaults change.
    const { error: profileCreateError } = await admin
      .from("users")
      .upsert({
        id: data.user.id,
        email,
        full_name: fullName,
        role: "end_user",
        is_active: false,
        status: "pending",
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });

    if (profileCreateError) {
      console.error("[auth/signup] profile creation failed:", profileCreateError);
      await admin.auth.admin.deleteUser(data.user.id);
      return NextResponse.json({ error: "Unable to finish account registration. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, approvalRequired: true });
  } catch (error) {
    console.error("[auth/signup] unexpected failure:", error);
    return NextResponse.json({ error: "Unable to create the account. Please try again." }, { status: 500 });
  }
}
