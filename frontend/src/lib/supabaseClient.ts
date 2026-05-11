import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase URL or Anon Key is missing. Please set them in .env.local");
}

// "Session-only login" strategy:
// - Supabase stores the auth token in localStorage so it survives cross-domain
//   redirects (e.g. Stripe checkout → back to our app).
// - On every fresh browser/tab start we check for a sessionStorage marker.
//   If the marker is absent the tab was just opened (or was previously closed),
//   so we wipe the localStorage auth token before Supabase can read it.
//   This gives us the "logout on tab close" behaviour without breaking redirects.
if (typeof window !== "undefined") {
  const MARKER = "lumos_tab_active";
  if (!sessionStorage.getItem(MARKER)) {
    const PROJECT_REF = supabaseUrl.match(/https:\/\/([^.]+)\./)?.[1];
    if (PROJECT_REF) {
      localStorage.removeItem(`sb-${PROJECT_REF}-auth-token`);
    }
    sessionStorage.setItem(MARKER, "1");
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
