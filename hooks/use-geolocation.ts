"use client";

import { useCallback, useState } from "react";

// Fallback location when geolocation is denied, unavailable, or fails.
export const MANILA_COORDS = { latitude: 14.5995, longitude: 120.9842 } as const;

export interface GeolocationState {
  latitude: number;
  longitude: number;
  error: string | null;
  loading: boolean;
}

function getErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Hindi pinayagan ang location access.";
    case error.POSITION_UNAVAILABLE:
      return "Hindi makuha ang iyong location.";
    case error.TIMEOUT:
      return "Natagalan ang pagkuha ng location.";
    default:
      return "May error sa pagkuha ng location.";
  }
}

/**
 * Gets the user's location on demand via `requestLocation()`.
 * We don't request on mount so the browser permission prompt only
 * appears after the user taps "Near Me".
 *
 * On error, latitude/longitude fall back to Manila and `error` is set.
 * `requestLocation` also resolves with the final state so callers can
 * act on the result immediately.
 */
export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    ...MANILA_COORDS,
    error: null,
    loading: false,
  });

  const requestLocation = useCallback((): Promise<GeolocationState> => {
    return new Promise((resolve) => {
      const finish = (next: GeolocationState) => {
        setState(next);
        resolve(next);
      };

      if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
        finish({
          ...MANILA_COORDS,
          error: "Hindi supported ng browser ang geolocation.",
          loading: false,
        });
        return;
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));

      navigator.geolocation.getCurrentPosition(
        (position) =>
          finish({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            error: null,
            loading: false,
          }),
        (error) =>
          finish({ ...MANILA_COORDS, error: getErrorMessage(error), loading: false }),
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
      );
    });
  }, []);

  return { ...state, requestLocation };
}
