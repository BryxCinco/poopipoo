"use client";

import { useSyncExternalStore } from "react";

import { getServerSnapshot, getSnapshot, setTheme, subscribe } from "@/lib/theme";

/**
 * The saved theme preference (light/dark/system), the theme actually shown,
 * and a setter. During SSR/hydration this reports light/system; the real value
 * arrives right after mount (the page itself is already themed by the <head> script).
 */
export function useTheme() {
  const { preference, resolved } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { preference, resolved, setTheme };
}
