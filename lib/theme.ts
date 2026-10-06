/**
 * Light / dark / auto ("system") theme.
 *
 * - The choice is saved per device in localStorage.
 * - The `dark` class on <html> drives the CSS variables (app/globals.css).
 * - THEME_INIT_SCRIPT runs in <head> before the page paints, so there is no
 *   light flash when dark mode is on.
 * - Module store for useSyncExternalStore (see hooks/use-theme.ts).
 */

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_KEY = "poopipoo:theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

/** Inline <head> script (kept tiny and dependency-free). */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");var d=t==="dark"||((t===null||t==="system")&&window.matchMedia("${DARK_QUERY}").matches);if(d)document.documentElement.classList.add("dark")}catch(e){}})()`;

interface ThemeState {
  preference: ThemePreference;
  resolved: ResolvedTheme;
}

const SERVER_STATE: ThemeState = { preference: "system", resolved: "light" };

let state: ThemeState | null = null;
const listeners = new Set<() => void>();

function readPreference(): ThemePreference {
  try {
    const saved = window.localStorage.getItem(THEME_KEY);
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}

const systemTheme = (): ResolvedTheme => (window.matchMedia(DARK_QUERY).matches ? "dark" : "light");

function resolve(preference: ThemePreference): ResolvedTheme {
  return preference === "system" ? systemTheme() : preference;
}

/** Applies the class, briefly enabling color transitions so the switch fades. */
function apply(resolved: ResolvedTheme, animate: boolean): void {
  const root = document.documentElement;
  if (animate) {
    root.classList.add("theme-transition");
    window.setTimeout(() => root.classList.remove("theme-transition"), 250);
  }
  root.classList.toggle("dark", resolved === "dark");
}

function setState(next: ThemeState): void {
  state = next;
  listeners.forEach((listener) => listener());
}

let mediaListenerAdded = false;

function init(): ThemeState {
  if (state) return state;
  const preference = readPreference();
  state = { preference, resolved: resolve(preference) };

  // Follow the phone/OS setting while on "Auto"
  if (!mediaListenerAdded) {
    mediaListenerAdded = true;
    window.matchMedia(DARK_QUERY).addEventListener("change", () => {
      if (!state || state.preference !== "system") return;
      const resolved = systemTheme();
      apply(resolved, true);
      setState({ preference: "system", resolved });
    });
  }
  return state;
}

export function setTheme(preference: ThemePreference): void {
  const resolved = resolve(preference);
  try {
    window.localStorage.setItem(THEME_KEY, preference);
  } catch {
    // storage blocked: applies until reload
  }
  apply(resolved, true);
  setState({ preference, resolved });
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getSnapshot = (): ThemeState => init();
export const getServerSnapshot = (): ThemeState => SERVER_STATE;
