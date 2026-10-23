import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    // Refresh the user session if cookies are present in the request.
    // Client-side pages (e.g. /dashboard, /admin) independently authenticate
    // using the browser client SDK, ensuring smooth operation both in first-party
    // tabs (e.g. Vercel) and iframe previews (AI Studio).
    const { error } = await supabase.auth.getUser();
    if (error) {
      const msg = error.message || "";
      if (
        msg.includes("Refresh Token") ||
        msg.includes("refresh_token") ||
        (error as any).code === "refresh_token_not_found" ||
        (error as any).status === 400
      ) {
        request.cookies.getAll().forEach((c) => {
          if (c.name.startsWith("sb-") && c.name.includes("-auth-token")) {
            response.cookies.delete(c.name);
          }
        });
      }
    }
  } catch (error: any) {
    const msg = error?.message || "";
    if (
      !msg.includes("Refresh Token") &&
      !msg.includes("refresh_token") &&
      error?.code !== "refresh_token_not_found"
    ) {
      console.warn("[proxy] session refresh notice:", error);
    }
  }

  return response;
}

