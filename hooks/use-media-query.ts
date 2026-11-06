"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * True while the media query matches. For what CSS can't do, like not mounting
 * a component at all. False on the server, so hide the layout with CSS too
 * (e.g. `md:hidden`) to avoid a flash before hydration.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    [query]
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  );
}
