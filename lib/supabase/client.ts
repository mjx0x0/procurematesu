import { createBrowserClient } from "@supabase/ssr";
import { parse, serialize } from "cookie";

const STORAGE_KEY = "msu_procurement_auth_cookies";

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

  return createBrowserClient(supabaseUrl, supabaseKey, {
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
}

// Backwards-compatible singleton client for existing client components.
export const supabase = createClient();

