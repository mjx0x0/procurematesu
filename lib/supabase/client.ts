import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Export createClient as a function
export const createClient = () => {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey);
};

// Export a pre-configured instance
export const supabase = createClient();