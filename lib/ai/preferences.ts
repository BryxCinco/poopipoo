/**
 * "AI Agent" on/off switch (Settings → AI Agent). Saved per device in
 * localStorage; on by default. Module store for useSyncExternalStore, so the
 * home page's floating button updates as soon as the settings toggle changes.
 */

const KEY = "poopipoo:ai-agent-enabled";

let enabled = true;
let loaded = false;
const listeners = new Set<() => void>();

function load(): void {
  if (loaded) return;
  loaded = true;
  try {
    enabled = window.localStorage.getItem(KEY) !== "0";
  } catch {
    // storage blocked: keep the default
  }
}

export function setAgentEnabled(value: boolean): void {
  enabled = value;
  try {
    window.localStorage.setItem(KEY, value ? "1" : "0");
  } catch {
    // storage blocked: works until reload
  }
  listeners.forEach((listener) => listener());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): boolean {
  load();
  return enabled;
}

/** Server render + hydration: treat as off so the button never flashes before the saved value is read. */
export const getServerSnapshot = (): boolean => false;
