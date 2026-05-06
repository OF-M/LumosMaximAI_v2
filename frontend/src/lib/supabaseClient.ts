import { createClient } from "@supabase/supabase-js";

// We use the NEXT_PUBLIC_ variables so they are available in the browser
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase URL or Anon Key is missing. Please set them in .env.local");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
