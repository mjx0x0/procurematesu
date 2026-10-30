import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function isStaleRefreshTokenError(error: unknown): boolean {
  if (!error) return false;
  if (typeof error === "string") {
    return (
      error.includes("Invalid Refresh Token") ||
      error.includes("Refresh Token Not Found") ||
      error.includes("refresh_token_not_found")
    );
  }
  if (typeof error === "object") {
    const obj = error as Record<string, unknown>;
    const text = String(obj.message || obj.name || "");
    if (
      text.includes("Invalid Refresh Token") ||
      text.includes("Refresh Token Not Found") ||
      text.includes("refresh_token_not_found")
    ) {
      return true;
    }
    if (
      Boolean(obj.__isAuthError) &&
      (text.includes("refresh") || obj.status === 400 || obj.code === "refresh_token_not_found" || obj.name === "AuthApiError")
    ) {
      return true;
    }
  }
  return false;
}


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

    const originalGetUser = supabase.auth.getUser.bind(supabase.auth);
    (supabase.auth.getUser as any) = async (jwt?: string) => {
      try {
        const res = await originalGetUser(jwt);
        if (res.error && isStaleRefreshTokenError(res.error)) {
          return { data: { user: null }, error: null };
        }
        return res;
      } catch (err: any) {
        if (isStaleRefreshTokenError(err)) {
          return { data: { user: null }, error: null };
        }
        throw err;
      }
    };

    const { error } = await supabase.auth.getUser();
    if (error && isStaleRefreshTokenError(error)) {
      request.cookies.getAll().forEach((c) => {
        if (c.name.startsWith("sb-") || c.name.includes("auth-token")) {
          try { request.cookies.delete(c.name); } catch {}
          try { response.cookies.delete(c.name); } catch {}
          try { response.cookies.set(c.name, "", { path: "/", maxAge: 0, expires: new Date(0) }); } catch {}
        }
      });
    }
  } catch (error: any) {
    if (isStaleRefreshTokenError(error)) {
      request.cookies.getAll().forEach((c) => {
        if (c.name.startsWith("sb-") || c.name.includes("auth-token")) {
          try { request.cookies.delete(c.name); } catch {}
          try { response.cookies.delete(c.name); } catch {}
          try { response.cookies.set(c.name, "", { path: "/", maxAge: 0, expires: new Date(0) }); } catch {}
        }
      });
    } else {
      console.warn("[proxy] session refresh notice:", error);
    }
  }

  return response;
}

