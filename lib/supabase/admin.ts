import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { getSupabaseUrl } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

/**
 * Admin client using the secret key (sb_secret_...). BYPASSES Row Level Security.
 * Server-only: never import this from a Client Component. (The key has no
 * NEXT_PUBLIC_ prefix, so it is never bundled for the browser anyway.)
 * Also used by scripts/seed-restrooms.ts, which runs outside Next.js.
 */
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("createAdminClient() must only be used on the server.");
  }

  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing environment variable SUPABASE_SECRET_KEY. Add it to .env.local.");
  }

  return createSupabaseClient<Database>(getSupabaseUrl(), secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
