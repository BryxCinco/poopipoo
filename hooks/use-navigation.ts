"use client";

import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { distance, point } from "@turf/turf";

import type { WatchedPosition } from "@/hooks/use-watch-position";
import { computeProgress, type NavigationProgress } from "@/lib/navigation-progress";
import {
  getServerSnapshot,
  getSnapshot,
  loadNavigationPreferences,
  markArrived,
  planRoute,
  reroute,
  retryRoute,
  setProfile,
  setVoiceEnabled,
  startNavigation,
  stopNavigation,
  subscribe,
  type NavigationState,
} from "@/lib/navigation-store";
import type { Route } from "@/lib/routing";
import { formatSpokenMeters, lowerFirst } from "@/lib/routing-translations";
import { speak } from "@/lib/voice";

/** The shared navigation session + its actions. */
export function useNavigation() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    loadNavigationPreferences();
  }, []);

  return {
    ...state,
    planRoute,
    retryRoute,
    setProfile,
    startNavigation,
    stopNavigation,
    setVoiceEnabled,
  };
}

// ---------- live guidance while navigating ----------

const ARRIVE_WITHIN_METERS = 25;
const OFF_ROUTE_MIN_METERS = 40;
const OFF_ROUTE_CONFIRMATIONS = 2; // consecutive off-route fixes before rerouting (GPS jumps)
const REROUTE_COOLDOWN_MS = 15_000;
const ANNOUNCE_AHEAD_METERS = 150;
const ANNOUNCE_NOW_METERS = 40;
const ANNOUNCE_ARRIVING_METERS = 100;
// Ignore very inaccurate fixes for reroute/arrival decisions
const MAX_USABLE_ACCURACY = 100;

/**
 * Turns live GPS positions into progress along the route, and handles the
 * side effects: arrival, rerouting when off-route, and voice announcements.
 */
export function useNavigationGuidance(
  nav: NavigationState,
  position: WatchedPosition
): NavigationProgress | null {
  const { route, destination, origin, status, voiceEnabled } = nav;
  const active = status === "navigating";

  // OSRM starts the route at the nearest road/path, which can be tens of meters
  // from where the user actually is (e.g. inside a mall). Allow that gap so the
  // starting position isn't treated as "off-route".
  const startGap = useMemo(() => {
    const first = route?.coordinates[0];
    if (!origin || !first) return 0;
    return distance(point([origin.longitude, origin.latitude]), point([first.longitude, first.latitude]), {
      units: "meters",
    });
  }, [origin, route]);

  const progress = useMemo(() => {
    if (!route || !destination || position.latitude === null || position.longitude === null) return null;
    return computeProgress(
      route,
      { latitude: position.latitude, longitude: position.longitude },
      destination
    );
  }, [route, destination, position.latitude, position.longitude]);

  const offRouteCount = useRef(0);
  const lastRerouteAt = useRef(0);
  // Announcements already made for the current route ("<step>:<kind>")
  const announced = useRef<{ route: Route | null; keys: Set<string> }>({ route: null, keys: new Set() });

  useEffect(() => {
    if (!active || !progress || !route || !destination) return;
    const usable = position.accuracy === null || position.accuracy <= MAX_USABLE_ACCURACY;

    // New route (start or reroute): forget what was announced
    if (announced.current.route !== route) {
      announced.current = { route, keys: new Set() };
    }
    const say = (key: string, text: string) => {
      if (announced.current.keys.has(key)) return;
      announced.current.keys.add(key);
      if (voiceEnabled) speak(text);
    };

    // 1. Arrival
    if (usable && (progress.distanceToDestination <= ARRIVE_WITHIN_METERS || progress.remainingDistance <= 15)) {
      say("arrive", `Nakarating ka na sa ${destination.name}`);
      markArrived();
      return;
    }

    // 2. Off-route → reroute from here (needs a couple of confirmations + cooldown)
    const threshold = Math.max(OFF_ROUTE_MIN_METERS, position.accuracy ?? 0, startGap + 20);
    if (usable && progress.offRouteMeters > threshold) {
      offRouteCount.current += 1;
      const now = Date.now();
      if (offRouteCount.current >= OFF_ROUTE_CONFIRMATIONS && now - lastRerouteAt.current > REROUTE_COOLDOWN_MS) {
        lastRerouteAt.current = now;
        offRouteCount.current = 0;
        if (voiceEnabled) speak("Naliligaw ka. Hinahanap ang bagong daan.");
        if (position.latitude !== null && position.longitude !== null) {
          void reroute({ latitude: position.latitude, longitude: position.longitude });
        }
      }
      return;
    }
    offRouteCount.current = 0;

    // 3. Voice: first instruction, then each maneuver ahead of time and when it's due
    say("start", route.steps[0]?.instruction ?? "Simulan ang biyahe");
    const next = progress.nextStepIndex !== null ? route.steps[progress.nextStepIndex] : null;
    if (next && next.maneuver !== "arrive") {
      const d = progress.distanceToNextManeuver;
      if (d <= ANNOUNCE_NOW_METERS) {
        say(`${progress.nextStepIndex}:now`, next.instruction);
      } else if (d <= ANNOUNCE_AHEAD_METERS) {
        say(`${progress.nextStepIndex}:ahead`, `Sa loob ng ${formatSpokenMeters(d)}, ${lowerFirst(next.instruction)}`);
      }
    }
    if (progress.remainingDistance <= ANNOUNCE_ARRIVING_METERS) {
      say("arriving", `Malapit ka na. ${formatSpokenMeters(progress.remainingDistance)} na lang.`);
    }
  }, [active, progress, route, destination, voiceEnabled, startGap, position.accuracy, position.latitude, position.longitude]);

  // Turning voice on mid-trip: say the upcoming direction right away
  // (earlier announcements were skipped while voice was off).
  const prevVoice = useRef(voiceEnabled);
  useEffect(() => {
    const turnedOn = voiceEnabled && !prevVoice.current;
    prevVoice.current = voiceEnabled;
    if (!turnedOn || !active || !progress || !route || progress.nextStepIndex === null) return;
    const next = route.steps[progress.nextStepIndex];
    speak(`Sa loob ng ${formatSpokenMeters(progress.distanceToNextManeuver)}, ${lowerFirst(next.instruction)}`);
  }, [voiceEnabled, active, progress, route]);

  return progress;
}
