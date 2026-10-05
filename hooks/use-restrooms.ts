"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

import { useAuthUser } from "@/hooks/use-auth-user";
import {
  addRestroom,
  ensureFreshRestrooms,
  fetchRestrooms,
  getServerSnapshot,
  getSnapshot,
  removeRestroom,
  subscribe,
} from "@/lib/restroom-store";
import type { Restroom } from "@/types/restroom";

/** Restrooms from Supabase via the shared client store. Fetches on first use. */
export function useRestroomsFromSupabase() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    ensureFreshRestrooms();
  }, []);

  return {
    restrooms: state.restrooms,
    /** First load only — background refreshes keep showing the cached list. */
    loading: !state.loaded && state.status !== "error",
    error: state.status === "error" ? state.error : null,
    retry: fetchRestrooms,
    addRestroom,
    removeRestroom,
  };
}

/** Supabase restrooms + "is this mine?" for the signed-in user. */
export function useRestrooms() {
  const data = useRestroomsFromSupabase();
  const { user } = useAuthUser();
  const userId = user?.id ?? null;

  const isUserAdded = useCallback(
    (restroom: Restroom) => userId !== null && restroom.createdBy === userId,
    [userId]
  );

  return { ...data, userId, isUserAdded };
}
