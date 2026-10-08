import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

/**
 * Server-side client with no user session (publishable key, RLS as a guest).
 * For public data outside a request's cookies, e.g. the sitemap: it only
 * sees what any visitor sees (no rejected restrooms).
 */
export function createAnonClient() {
  return createSupabaseClient<Database>(getSupabaseUrl(), getSupabasePublishableKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
