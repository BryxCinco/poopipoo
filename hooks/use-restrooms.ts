"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import {
  addUserRestroom,
  getAllRestrooms,
  getServerAllRestrooms,
  getServerUserRestrooms,
  getUserRestrooms,
  removeUserRestroom,
  subscribe,
} from "@/lib/restroom-store";

/**
 * Restrooms from the local store (mock + user-added).
 *
 * During SSR and the first client render only mock data is available
 * (localStorage can't be read on the server), so `loading` stays true until
 * the component has mounted and user-added restrooms are included.
 */
export function useRestrooms() {
  const restrooms = useSyncExternalStore(subscribe, getAllRestrooms, getServerAllRestrooms);
  const userRestrooms = useSyncExternalStore(
    subscribe,
    getUserRestrooms,
    getServerUserRestrooms
  );

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isUserAdded = useCallback(
    (id: string) => userRestrooms.some((restroom) => restroom.id === id),
    [userRestrooms]
  );

  return {
    restrooms,
    userRestrooms,
    isUserAdded,
    addRestroom: addUserRestroom,
    removeRestroom: removeUserRestroom,
    loading: !mounted,
  };
}
