import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const EMAIL_PATTERN = /^[^\s@]+@msugensan\.edu\.ph$/i;

function mapAuthError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("email address not authorized")) {
    return "The verification email could not be sent because this Supabase project is not configured to deliver email to this address. Please contact the system administrator.";
  }
  if (normalized.includes("rate limit") || normalized.includes("too many")) {
    return "The verification email service is temporarily rate-limited. Please wait a few minutes and try again.";
  }
  return "Unable to send the verification email. Please try again later.";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ error: "Only @msugensan.edu.ph institutional email addresses are allowed." }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
      return NextResponse.json({ error: "Verification email service is temporarily unavailable." }, { status: 500 });
    }

    const supabase = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${new URL(request.url).origin}/auth/login?verified=1`,
      },
    });

    if (error) {
      console.error("[auth/resend-verification] resend failed:", error);
      return NextResponse.json({ error: mapAuthError(error.message) }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[auth/resend-verification] unexpected failure:", error);
    return NextResponse.json({ error: "Unable to send the verification email. Please try again later." }, { status: 500 });
  }
}
