"use client";

import { useCallback, useSyncExternalStore } from "react";

import { useAuthUser } from "@/hooks/use-auth-user";
import {
  addRestroom,
  getServerSnapshot,
  getSnapshot,
  refetchRestrooms,
  removeRestroom,
  subscribe,
} from "@/lib/restroom-store";
import type { Restroom } from "@/types/restroom";

/**
 * Restrooms from Supabase via the shared client store. Doesn't fetch by itself:
 * the map (RestroomBoundsLoader) and the list ask for their own area.
 */
export function useRestroomsFromSupabase() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return {
    restrooms: state.restrooms,
    /** First load only — background refreshes keep showing the cached list. */
    loading: !state.loaded && state.status !== "error",
    error: state.status === "error" ? state.error : null,
    /** More restrooms in the area than were loaded (zoom in to see them). */
    truncated: state.truncated,
    retry: refetchRestrooms,
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
