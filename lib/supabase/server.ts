import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Especially important if using Fluid compute: Don't put this client in a
 * global variable. Always create a new client within each function when using
 * it.
 */
export async function createClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "placeholder-key";

  const client = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have proxy refreshing
            // user sessions.
          }
        },
      },
    },
  );

  // Wrap getUser to catch invalid refresh token errors gracefully
  const originalGetUser = client.auth.getUser.bind(client.auth);
  (client.auth.getUser as any) = async (jwt?: string) => {
    try {
      const res = await originalGetUser(jwt);
      if (res.error) {
        const msg = res.error.message || "";
        if (
          msg.includes("Refresh Token") ||
          msg.includes("refresh_token") ||
          (res.error as any).code === "refresh_token_not_found"
        ) {
          return { data: { user: null }, error: null };
        }
      }
      return res;
    } catch (err: any) {
      const msg = err?.message || "";
      if (
        msg.includes("Refresh Token") ||
        msg.includes("refresh_token") ||
        err?.code === "refresh_token_not_found"
      ) {
        return { data: { user: null }, error: null };
      }
      throw err;
    }
  };

  // Wrap getSession to catch invalid refresh token errors gracefully
  const originalGetSession = client.auth.getSession.bind(client.auth);
  (client.auth.getSession as any) = async () => {
    try {
      const res = await originalGetSession();
      if (res.error) {
        const msg = res.error.message || "";
        if (
          msg.includes("Refresh Token") ||
          msg.includes("refresh_token") ||
          (res.error as any).code === "refresh_token_not_found"
        ) {
          return { data: { session: null }, error: null };
        }
      }
      return res;
    } catch (err: any) {
      const msg = err?.message || "";
      if (
        msg.includes("Refresh Token") ||
        msg.includes("refresh_token") ||
        err?.code === "refresh_token_not_found"
      ) {
        return { data: { session: null }, error: null };
      }
      throw err;
    }
  };

  return client;
}
