import { createBrowserClient } from "@supabase/ssr";
import { parse, serialize } from "cookie";

const STORAGE_KEY = "msu_procurement_auth_cookies";

export function clearAuthStorageAndCookies() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage?.removeItem(STORAGE_KEY);
    const keysToRemove: string[] = [];
    for (let i = 0; i < (window.localStorage?.length || 0); i++) {
      const k = window.localStorage.key(i);
      if (k && (k.startsWith("sb-") || k.includes("auth-token"))) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => window.localStorage.removeItem(k));

    if (typeof document !== "undefined") {
      const parsed = parse(document.cookie || "");
      Object.keys(parsed).forEach((name) => {
        if (name.startsWith("sb-") || name.includes("auth-token")) {
          document.cookie = `${name}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        }
      });
    }
  } catch {}
}

export function isStaleRefreshTokenError(error: unknown): boolean {
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

const globalScope = typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : null);
if (globalScope?.console) {
  const originalConsoleError = globalScope.console.error;
  globalScope.console.error = (...args: any[]) => {
    if (args.some(isStaleRefreshTokenError)) {
      clearAuthStorageAndCookies();
      return;
    }
    originalConsoleError.apply(globalScope.console, args);
  };
}

if (typeof process !== "undefined" && typeof process.on === "function") {
  process.on("unhandledRejection", (reason: any) => {
    if (isStaleRefreshTokenError(reason)) {
      return;
    }
  });
}

function getStoredCookies(): { name: string; value: string }[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStoredCookies(cookies: { name: string; value: string }[]) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cookies));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Browser Supabase client.
 * Auth sessions are managed by @supabase/ssr with a dual document.cookie + localStorage
 * adapter to guarantee session persistence both in top-level hosting (e.g. Vercel)
 * and in sandboxed cross-origin iframe previews (e.g. AI Studio).
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "placeholder-key";

  const client = createBrowserClient(supabaseUrl, supabaseKey, {
    isSingleton: true,
    cookies: {
      getAll() {
        if (typeof document === "undefined") return [];
        const parsed = parse(document.cookie || "");
        const docCookies = Object.keys(parsed).map((name) => ({
          name,
          value: parsed[name] ?? "",
        }));

        const stored = getStoredCookies();
        if (stored.length === 0) return docCookies;

        const mergedMap = new Map<string, string>();
        stored.forEach((c) => mergedMap.set(c.name, c.value));
        docCookies.forEach((c) => {
          if (c.value) mergedMap.set(c.name, c.value);
        });

        return Array.from(mergedMap.entries()).map(([name, value]) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        if (typeof document === "undefined") return;

        let stored = getStoredCookies();

        cookiesToSet.forEach(({ name, value, options }) => {
          const isExpiring =
            options?.maxAge === 0 ||
            (options?.expires && options.expires.getTime() <= Date.now());

          const isSecure = typeof location !== "undefined" && location.protocol === "https:";
          const cookieStr = serialize(name, value, {
            path: "/",
            ...options,
            sameSite: isSecure ? "none" : (options?.sameSite || "lax"),
            secure: isSecure ? true : options?.secure,
          });
          document.cookie = cookieStr;

          stored = stored.filter((item) => item.name !== name);
          if (!isExpiring && value) {
            stored.push({ name, value });
          }
        });

        saveStoredCookies(stored);
      },
    },
  });

  // Wrap getUser to catch invalid refresh token errors gracefully
  const originalGetUser = client.auth.getUser.bind(client.auth);
  (client.auth.getUser as any) = async (jwt?: string) => {
    try {
      const res = await originalGetUser(jwt);
      if (res.error && isStaleRefreshTokenError(res.error)) {
        clearAuthStorageAndCookies();
        return { data: { user: null }, error: null };
      }
      return res;
    } catch (err: any) {
      if (isStaleRefreshTokenError(err)) {
        clearAuthStorageAndCookies();
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
      if (res.error && isStaleRefreshTokenError(res.error)) {
        clearAuthStorageAndCookies();
        return { data: { session: null }, error: null };
      }
      return res;
    } catch (err: any) {
      if (isStaleRefreshTokenError(err)) {
        clearAuthStorageAndCookies();
        return { data: { session: null }, error: null };
      }
      throw err;
    }
  };

  // Wrap signOut to guarantee clean teardown even if remote token is already revoked
  const originalSignOut = client.auth.signOut.bind(client.auth);
  (client.auth.signOut as any) = async (options?: any) => {
    try {
      const res = await originalSignOut(options);
      clearAuthStorageAndCookies();
      return res;
    } catch {
      clearAuthStorageAndCookies();
      return { error: null };
    }
  };

  return client;
}

// Backwards-compatible singleton client for existing client components.
export const supabase = createClient();


