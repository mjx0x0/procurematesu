import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client.
 * Auth sessions are managed by @supabase/ssr and synchronized with the
 * server through the middleware cookie flow.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase environment variables are not configured.");
  }

  return createBrowserClient(supabaseUrl, supabaseKey);
}

// Backwards-compatible export for existing client components.
export const supabase = createClient();
