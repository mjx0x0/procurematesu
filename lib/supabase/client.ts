import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client.
 * Auth sessions are managed by @supabase/ssr and synchronized with the
 * server through the middleware cookie flow.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "placeholder-key";

  return createBrowserClient(supabaseUrl, supabaseKey);
}

// Backwards-compatible export for existing client components.
export const supabase = createClient();
