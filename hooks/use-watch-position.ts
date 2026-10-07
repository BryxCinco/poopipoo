"use client";

import { useEffect, useRef, useState } from "react";

import { useI18n } from "@/hooks/use-i18n";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export interface WatchedPosition {
  latitude: number | null;
  longitude: number | null;
  /** Meters (95% confidence radius) */
  accuracy: number | null;
  /** Degrees from north, when moving (often null when standing still) */
  heading: number | null;
  /** Meters per second */
  speed: number | null;
  error: string | null;
  /** Waiting for the first fix */
  loading: boolean;
}

const INITIAL: WatchedPosition = {
  latitude: null,
  longitude: null,
  accuracy: null,
  heading: null,
  speed: null,
  error: null,
  loading: false,
};

// GPS can fire many times a second; re-render at most this often
// (sooner if the user moved a fair bit) to save battery and CPU.
const MIN_UPDATE_MS = 1000;
const MIN_MOVE_METERS = 5;

function messageFor(error: GeolocationPositionError, t: Dictionary["geo"]): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return t.gpsDenied;
    case error.POSITION_UNAVAILABLE:
      return t.gpsUnavailable;
    case error.TIMEOUT:
      return t.gpsTimeout;
    default:
      return t.gpsGeneric;
  }
}

/** Rough distance in meters (equirectangular; fine for a few meters). */
function metersBetween(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const x = ((lon2 - lon1) * Math.PI) / 180 * Math.cos((((lat1 + lat2) / 2) * Math.PI) / 180);
  const y = ((lat2 - lat1) * Math.PI) / 180;
  return Math.sqrt(x * x + y * y) * 6_371_000;
}

/**
 * Live position via navigator.geolocation.watchPosition while `enabled`.
 * Stops watching (and the GPS) when disabled or unmounted.
 * Needs HTTPS in production (localhost is fine for development).
 */
export function useWatchPosition({ enabled }: { enabled: boolean }): WatchedPosition {
  const [state, setState] = useState<WatchedPosition>(INITIAL);
  const last = useRef<{ at: number; lat: number; lon: number } | null>(null);
  // Messages in the current language; a ref so the watch isn't restarted on a language switch
  const { t } = useI18n();
  const geoText = useRef(t.geo);
  geoText.current = t.geo;

  useEffect(() => {
    if (!enabled) {
      setState(INITIAL);
      last.current = null;
      return;
    }
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setState({ ...INITIAL, error: geoText.current.gpsUnsupported });
      return;
    }

    setState((prev) => ({ ...prev, loading: prev.latitude === null, error: null }));

    const id = navigator.geolocation.watchPosition(
      ({ coords, timestamp }) => {
        const prev = last.current;
        const moved = prev ? metersBetween(prev.lat, prev.lon, coords.latitude, coords.longitude) : Infinity;
        if (prev && timestamp - prev.at < MIN_UPDATE_MS && moved < MIN_MOVE_METERS) return;

        last.current = { at: timestamp, lat: coords.latitude, lon: coords.longitude };
        setState({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          heading: coords.heading !== null && !Number.isNaN(coords.heading) ? coords.heading : null,
          speed: coords.speed,
          error: null,
          loading: false,
        });
      },
      (error) => {
        // Keep the last known position; just surface the error
        setState((prev) => ({ ...prev, error: messageFor(error, geoText.current), loading: false }));
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20_000 }
    );

    return () => navigator.geolocation.clearWatch(id);
  }, [enabled]);

  return state;
}
