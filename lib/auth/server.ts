import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

/**
 * Current user, validated with the Supabase Auth server (unlike getSession(),
 * which trusts the cookie). Cached per request. null for guests.
 */
export const getCurrentUser = cache(async () => {
  const {
    data: { user },
  } = await createClient().auth.getUser();
  return user;
});
