import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const EMAIL_PATTERN = /^[^\s@]+@msugensan\.edu\.ph$/i;

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

function getPublicAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

function mapAuthError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("email address not authorized")) {
    return "Your verification email could not be sent because this Supabase project is not configured to deliver email to this address. Please contact the system administrator to configure the project's email service.";
  }

  if (normalized.includes("rate limit") || normalized.includes("too many")) {
    return "The verification email service is temporarily rate-limited. Please wait a few minutes and try again.";
  }

  if (normalized.includes("invalid email")) {
    return "Please enter a valid MSU-Gensan institutional email address.";
  }

  if (normalized.includes("password")) {
    return message;
  }

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
      return NextResponse.json(
        { error: "Only @msugensan.edu.ph institutional email addresses are allowed." },
        { status: 400 },
      );
    }

    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters and include uppercase, lowercase, and a number." },
        { status: 400 },
      );
    }

    const admin = getAdminClient();
    const publicAuth = getPublicAuthClient();
    if (!admin || !publicAuth) {
      console.error("[auth/signup] Supabase environment variables are not configured.");
      return NextResponse.json({ error: "Account registration is temporarily unavailable." }, { status: 500 });
    }

    // Check the application's account record first. This lets us deliberately
    // handle rejected accounts instead of relying on Supabase's intentionally
    // obfuscated signUp() response for existing emails.
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

    // A rejected account keeps its Auth user so its historical identity can be
    // retained. Re-registration reuses that Auth ID, resets the password and
    // puts the account back into the pending approval state.
    if (profile?.status === "rejected") {
      const { data: existingAuth, error: existingAuthError } = await admin.auth.admin.getUserById(profile.id);
      if (existingAuthError || !existingAuth.user) {
        console.error("[auth/signup] rejected account Auth lookup failed:", existingAuthError);
        return NextResponse.json({ error: "This account needs administrator assistance before it can be registered again." }, { status: 409 });
      }

      const { error: authUpdateError } = await admin.auth.admin.updateUserById(profile.id, {
        password,
        email_confirm: false,
        user_metadata: { full_name: fullName },
      });

      if (authUpdateError) {
        console.error("[auth/signup] rejected account reset failed:", authUpdateError);
        return NextResponse.json({ error: "Unable to restart the rejected account registration. Please try again." }, { status: 500 });
      }

      const { error: profileUpdateError } = await admin
        .from("users")
        .update({
          email,
          full_name: fullName,
          role: "end_user",
          is_active: false,
          status: "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (profileUpdateError) {
        console.error("[auth/signup] rejected profile reset failed:", profileUpdateError);
        return NextResponse.json({ error: "Unable to restart the account registration. Please try again." }, { status: 500 });
      }

      const { error: resendError } = await admin.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${new URL(request.url).origin}/auth/login?verified=1` },
      });

      if (resendError) {
        console.error("[auth/signup] rejected-account verification email failed:", resendError);
        return NextResponse.json({ error: mapAuthError(resendError.message) }, { status: 502 });
      }

      return NextResponse.json({ ok: true, verificationEmailSent: true, reactivated: true });
    }

    // The public.users row may be absent for an Auth user left behind by an
    // older deployment. Check Auth as well so duplicate emails cannot slip
    // through merely because the application profile is missing.
    const { data: authList, error: authListError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (authListError) {
      console.error("[auth/signup] Auth duplicate lookup failed:", authListError);
      return NextResponse.json({ error: "Unable to verify whether the email address already exists." }, { status: 500 });
    }

    const existingAuth = authList.users.find((user) => user.email?.toLowerCase() === email);
    if (existingAuth) {
      return NextResponse.json({ error: "This email address already exists. Please sign in instead." }, { status: 409 });
    }

    const { data, error: signupError } = await publicAuth.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${new URL(request.url).origin}/auth/login?verified=1`,
      },
    });

    if (signupError) {
      console.error("[auth/signup] Supabase signUp failed:", signupError);
      return NextResponse.json({ error: mapAuthError(signupError.message) }, { status: 400 });
    }

    // With email confirmation enabled, a genuine new signup has no session.
    // If a session is returned, email confirmation is disabled, which violates
    // this application's required verification flow. Remove the just-created
    // account instead of pretending that verification email was sent.
    if (data.session && data.user) {
      await admin.from("users").delete().eq("id", data.user.id);
      await admin.auth.admin.deleteUser(data.user.id);
      return NextResponse.json(
        { error: "Account registration requires email verification. Please ask the system administrator to enable email confirmations in Supabase Auth." },
        { status: 503 },
      );
    }

    // Supabase may return an obfuscated/fake user for an existing account when
    // email confirmation is enabled. The pre-check normally catches this, but
    // this closes the race-condition window.
    if (!data.user || !data.user.identities?.length) {
      return NextResponse.json({ error: "This email address already exists. Please sign in instead." }, { status: 409 });
    }

    return NextResponse.json({ ok: true, verificationEmailSent: true });
  } catch (error) {
    console.error("[auth/signup] unexpected failure:", error);
    return NextResponse.json({ error: "Unable to create the account. Please try again." }, { status: 500 });
  }
}
