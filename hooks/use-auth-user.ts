"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";

/**
 * The signed-in Supabase user on the client (null for guests).
 * Reads the session from cookies via onAuthStateChange (no network request),
 * so only use it for UI decisions — the server/RLS enforces real permissions.
 */
export function useAuthUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    // Fires INITIAL_SESSION right away, then on sign-in/sign-out/token refresh.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return { user, loading };
}
