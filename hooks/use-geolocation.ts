"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useI18n } from "@/hooks/use-i18n";
import type { Dictionary } from "@/lib/i18n/dictionaries";

// Fallback location when geolocation is denied, unavailable, or fails.
export const MANILA_COORDS = { latitude: 14.5995, longitude: 120.9842 } as const;

const POSITION_TIMEOUT_MS = 10_000;
// A bit longer than the API timeout so the browser's own error wins when it fires.
const SAFETY_TIMEOUT_MS = POSITION_TIMEOUT_MS + 2_000;

export interface GeolocationState {
  latitude: number;
  longitude: number;
  error: string | null;
  loading: boolean;
  /** True only when coordinates came from the device (not the Manila fallback). */
  hasLocation: boolean;
}

interface UseGeolocationOptions {
  /** Ask for the location as soon as the component mounts. */
  requestOnMount?: boolean;
}

function getErrorMessage(error: GeolocationPositionError, t: Dictionary["geo"]): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return t.denied;
    case error.POSITION_UNAVAILABLE:
      return t.unavailable;
    case error.TIMEOUT:
      return t.timeout;
    default:
      return t.generic;
  }
}

/**
 * Gets the user's location via `requestLocation()`.
 * By default it waits for a user action (e.g. "Near Me") so the browser
 * permission prompt isn't shown on page load; pass `requestOnMount` for
 * pages that need the location right away (e.g. the list).
 *
 * On error, latitude/longitude fall back to Manila and `error` is set.
 * `requestLocation` also resolves with the final state so callers can
 * act on the result immediately.
 */
export function useGeolocation({ requestOnMount = false }: UseGeolocationOptions = {}) {
  // Messages in the current language; a ref so requestLocation stays stable
  const { t } = useI18n();
  const geoText = useRef(t.geo);
  geoText.current = t.geo;
  const [state, setState] = useState<GeolocationState>({
    ...MANILA_COORDS,
    error: null,
    // Start in loading state when auto-requesting, to avoid a flash of "no location".
    loading: requestOnMount,
    hasLocation: false,
  });

  const requestLocation = useCallback((): Promise<GeolocationState> => {
    return new Promise((resolve) => {
      let settled = false;
      let safetyTimer: ReturnType<typeof setTimeout> | undefined;

      // Only the first result counts (real callback or the safety timeout).
      const finish = (next: GeolocationState) => {
        if (settled) return;
        settled = true;
        clearTimeout(safetyTimer);
        setState(next);
        resolve(next);
      };

      if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
        finish({
          ...MANILA_COORDS,
          error: geoText.current.unsupported,
          loading: false,
          hasLocation: false,
        });
        return;
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));

      // The API's own `timeout` only starts after permission is granted. Some
      // browsers (e.g. Firefox when the prompt is dismissed) never call back at
      // all, which would leave us loading forever — so give up after a while.
      safetyTimer = setTimeout(
        () =>
          finish({
            ...MANILA_COORDS,
            error: geoText.current.timeout,
            loading: false,
            hasLocation: false,
          }),
        SAFETY_TIMEOUT_MS
      );

      navigator.geolocation.getCurrentPosition(
        (position) =>
          finish({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            error: null,
            loading: false,
            hasLocation: true,
          }),
        (error) =>
          finish({
            ...MANILA_COORDS,
            error: getErrorMessage(error, geoText.current),
            loading: false,
            hasLocation: false,
          }),
        { enableHighAccuracy: true, timeout: POSITION_TIMEOUT_MS, maximumAge: 60_000 }
      );
    });
  }, []);

  useEffect(() => {
    if (requestOnMount) {
      void requestLocation();
    }
  }, [requestOnMount, requestLocation]);

  return { ...state, requestLocation };
}
