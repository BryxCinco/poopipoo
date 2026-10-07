import { getRoute, RoutingError, type Route, type RouteProfile, type RoutingErrorKind } from "@/lib/routing";
import { stopSpeaking } from "@/lib/voice";
import type { LatLng } from "@/types/geo";

/**
 * The active navigation session, shared by the map page, the detail page and
 * the restroom sheet (a plan can start on one page and continue on another).
 * Module-level store for useSyncExternalStore. Lives in memory only, so a
 * full page reload ends navigation.
 *
 *   idle -> routing -> preview -> navigating -> arrived
 *              -> error
 */

export type NavigationStatus = "idle" | "routing" | "preview" | "navigating" | "arrived" | "error";

export interface NavigationDestination extends LatLng {
  id: string;
  name: string;
}

export interface NavigationState {
  status: NavigationStatus;
  destination: NavigationDestination | null;
  /** Where the current route starts */
  origin: LatLng | null;
  profile: RouteProfile;
  route: Route | null;
  /** Why routing failed (the UI shows the message in the current language) */
  error: RoutingErrorKind | null;
  /** Recalculating after going off-route (keeps showing the old route meanwhile) */
  rerouting: boolean;
  voiceEnabled: boolean;
}

const VOICE_KEY = "poopipoo:voice-guidance";

const INITIAL: NavigationState = {
  status: "idle",
  destination: null,
  origin: null,
  profile: "foot",
  route: null,
  error: null,
  rerouting: false,
  voiceEnabled: false,
};

let state: NavigationState = INITIAL;
const listeners = new Set<() => void>();
// Ignore results from superseded route requests (e.g. profile switched mid-request)
let requestId = 0;

function setState(partial: Partial<NavigationState>): void {
  state = { ...state, ...partial };
  listeners.forEach((listener) => listener());
}

const kindOf = (error: unknown): RoutingErrorKind => (error instanceof RoutingError ? error.kind : "unknown");

// ---------- actions ----------

/** Fetches a route and shows it as a preview (before "Simulan"). */
export async function planRoute(destination: NavigationDestination, origin: LatLng): Promise<void> {
  const id = ++requestId;
  setState({ status: "routing", destination, origin, route: null, error: null, rerouting: false });
  try {
    const route = await getRoute(origin, destination, state.profile);
    if (id !== requestId) return;
    setState({ status: "preview", route });
  } catch (error) {
    if (id !== requestId) return;
    setState({ status: "error", error: kindOf(error) });
  }
}

/** Retry after an error, with the same destination and origin. */
export function retryRoute(): void {
  if (state.destination && state.origin) void planRoute(state.destination, state.origin);
}

/** Switch Lakad/Sasakyan. Re-plans the preview with the new profile. */
export function setProfile(profile: RouteProfile): void {
  if (profile === state.profile) return;
  setState({ profile });
  if (state.destination && state.origin && state.status !== "navigating") {
    void planRoute(state.destination, state.origin);
  }
}

export function startNavigation(): void {
  if (state.route) setState({ status: "navigating" });
}

/** New route from the user's current position after going off-route. Keeps the old one if it fails. */
export async function reroute(from: LatLng): Promise<void> {
  const { destination } = state;
  if (!destination || state.status !== "navigating" || state.rerouting) return;
  const id = ++requestId;
  setState({ rerouting: true });
  try {
    const route = await getRoute(from, destination, state.profile);
    if (id !== requestId || state.status !== "navigating") return;
    setState({ route, origin: from, rerouting: false });
  } catch {
    if (id === requestId) setState({ rerouting: false });
  }
}

export function markArrived(): void {
  if (state.status === "navigating") setState({ status: "arrived" });
}

/** Ends navigation everywhere. Keeps the profile and voice preference. */
export function stopNavigation(): void {
  requestId++;
  stopSpeaking();
  setState({ ...INITIAL, profile: state.profile, voiceEnabled: state.voiceEnabled });
}

export function setVoiceEnabled(enabled: boolean): void {
  if (!enabled) stopSpeaking();
  setState({ voiceEnabled: enabled });
  try {
    window.localStorage.setItem(VOICE_KEY, enabled ? "1" : "0");
  } catch {
    // storage blocked: preference just isn't remembered
  }
}

/** Reads saved preferences. Call after mount (localStorage isn't available during SSR). */
export function loadNavigationPreferences(): void {
  try {
    const saved = window.localStorage.getItem(VOICE_KEY) === "1";
    if (saved !== state.voiceEnabled) setState({ voiceEnabled: saved });
  } catch {
    // ignore
  }
}

// ---------- useSyncExternalStore plumbing ----------

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getSnapshot = (): NavigationState => state;
export const getServerSnapshot = (): NavigationState => INITIAL;
