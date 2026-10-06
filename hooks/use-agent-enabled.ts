"use client";

import { useSyncExternalStore } from "react";

import { getServerSnapshot, getSnapshot, setAgentEnabled, subscribe } from "@/lib/ai/preferences";

/** The "AI Agent" on/off preference (per device) and its setter. */
export function useAgentEnabled(): [boolean, (enabled: boolean) => void] {
  const enabled = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return [enabled, setAgentEnabled];
}
