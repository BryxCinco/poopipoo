import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

/**
 * Supabase client for Client Components. Uses the publishable key; the session
 * lives in cookies (shared with the server client). `createBrowserClient`
 * returns a singleton, so calling this repeatedly is cheap.
 */
export function createClient() {
  return createBrowserClient<Database>(getSupabaseUrl(), getSupabasePublishableKey());
}
