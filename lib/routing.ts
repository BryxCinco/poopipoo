import type { Locale } from "@/lib/i18n/config";
import {
  toManeuver,
  translateInstruction,
  type Maneuver,
  type OsrmManeuverInput,
  type RouteProfile,
} from "@/lib/routing-translations";
import type { LatLng } from "@/types/geo";

/**
 * Free routing via OSRM (Open Source Routing Machine) on the FOSSGIS servers
 * at routing.openstreetmap.de. No API key. They host separate foot and car
 * profiles (the router.project-osrm.org demo only does car routes).
 * Usage policy: max ~1 request/second, light use only:
 * https://routing.openstreetmap.de/about.html
 * Note: the user's location is sent to this server when requesting a route.
 */

export type { RouteProfile } from "@/lib/routing-translations";

const ENDPOINTS: Record<RouteProfile, string> = {
  // The "driving" segment is required by the OSRM URL format; the server path picks the profile
  foot: "https://routing.openstreetmap.de/routed-foot/route/v1/driving",
  car: "https://routing.openstreetmap.de/routed-car/route/v1/driving",
};

export interface RouteStep {
  /** Raw OSRM maneuver; turn it into text with stepInstruction() (in the current language) */
  input: OsrmManeuverInput;
  /** Meters from this maneuver to the next one */
  distance: number;
  /** Seconds from this maneuver to the next one */
  duration: number;
  maneuver: Maneuver;
  /** Where the maneuver happens */
  location: LatLng;
  /** Street name ("" if unnamed) */
  name: string;
}

export interface Route {
  profile: RouteProfile;
  /** GeoJSON LineString ([longitude, latitude] pairs), as returned by OSRM */
  geometry: { type: "LineString"; coordinates: [number, number][] };
  /** Same line as LatLng points, ready for Leaflet */
  coordinates: LatLng[];
  /** Meters */
  distance: number;
  /** Seconds */
  duration: number;
  steps: RouteStep[];
}

export type RoutingErrorKind = "network" | "rate-limit" | "no-route" | "unknown";

const ERROR_MESSAGES: Record<RoutingErrorKind, string> = {
  network: "Walang koneksyon sa routing server. I-check ang internet mo.",
  "rate-limit": "Masyadong maraming request. Maghintay ng ilang segundo at subukan ulit.",
  "no-route": "Walang mahanap na daan papunta sa CR na ito.",
  unknown: "Hindi makuha ang ruta. Subukan ulit.",
};

/** A step's instruction in the given language, e.g. "Kumanan sa Ayala Avenue" / "Turn right onto Ayala Avenue". */
export function stepInstruction(step: RouteStep, profile: RouteProfile, locale: Locale): string {
  return translateInstruction(step.input, step.name, profile, locale);
}

export class RoutingError extends Error {
  constructor(public readonly kind: RoutingErrorKind) {
    super(ERROR_MESSAGES[kind]);
    this.name = "RoutingError";
  }
}

// ---------- OSRM response parsing (validated, no `any`) ----------

interface OsrmStep {
  distance: number;
  duration: number;
  name: string;
  maneuver: { type: string; modifier?: string; exit?: number; bearing_after?: number; location: [number, number] };
}

interface OsrmRoute {
  distance: number;
  duration: number;
  geometry: { type: "LineString"; coordinates: [number, number][] };
  legs: { steps: OsrmStep[] }[];
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const isPair = (v: unknown): v is [number, number] =>
  Array.isArray(v) && v.length >= 2 && typeof v[0] === "number" && typeof v[1] === "number";

function isOsrmStep(v: unknown): v is OsrmStep {
  if (!isRecord(v) || !isRecord(v.maneuver)) return false;
  return (
    typeof v.distance === "number" &&
    typeof v.duration === "number" &&
    typeof v.maneuver.type === "string" &&
    isPair(v.maneuver.location)
  );
}

function isOsrmRoute(v: unknown): v is OsrmRoute {
  if (!isRecord(v) || !isRecord(v.geometry) || !Array.isArray(v.legs)) return false;
  return (
    typeof v.distance === "number" &&
    typeof v.duration === "number" &&
    v.geometry.type === "LineString" &&
    Array.isArray(v.geometry.coordinates) &&
    v.geometry.coordinates.every(isPair) &&
    v.legs.every((leg) => isRecord(leg) && Array.isArray(leg.steps) && leg.steps.every(isOsrmStep))
  );
}

function toRoute(osrm: OsrmRoute, profile: RouteProfile): Route {
  const steps = osrm.legs.flatMap((leg) => leg.steps);
  return {
    profile,
    geometry: osrm.geometry,
    coordinates: osrm.geometry.coordinates.map(([longitude, latitude]) => ({ latitude, longitude })),
    distance: osrm.distance,
    duration: osrm.duration,
    steps: steps.map((step) => {
      const input = {
        type: step.maneuver.type,
        modifier: step.maneuver.modifier,
        exit: step.maneuver.exit,
        bearingAfter: step.maneuver.bearing_after,
      };
      const name = typeof step.name === "string" ? step.name : "";
      return {
        input,
        distance: step.distance,
        duration: step.duration,
        maneuver: toManeuver(input),
        location: { latitude: step.maneuver.location[1], longitude: step.maneuver.location[0] },
        name,
      };
    }),
  };
}

// ---------- cache + throttle ----------

const CACHE_TTL_MS = 10 * 60_000;
const CACHE_MAX = 30;
const MIN_INTERVAL_MS = 1100; // stay under the server's ~1 request/second limit
const TIMEOUT_MS = 15_000;
const MAX_SNAP_METERS = 2000;

const cache = new Map<string, { route: Route; at: number }>();
const inflight = new Map<string, Promise<Route>>();
let lastRequestAt = 0;

/**
 * Cache key: origin rounded to ~11 m (4 decimals) so small GPS jitter reuses
 * the cached route; destination to ~1 m.
 */
const cacheKey = (from: LatLng, to: LatLng, profile: RouteProfile) =>
  [profile, from.latitude.toFixed(4), from.longitude.toFixed(4), to.latitude.toFixed(5), to.longitude.toFixed(5)].join(":");

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function requestRoute(from: LatLng, to: LatLng, profile: RouteProfile): Promise<Route> {
  // Space requests out (also queues bursts like quick profile switching)
  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
  lastRequestAt = Math.max(Date.now(), lastRequestAt + MIN_INTERVAL_MS);
  if (wait > 0) await sleep(wait);

  const coords = `${from.longitude},${from.latitude};${to.longitude},${to.latitude}`;
  const url = `${ENDPOINTS[profile]}/${coords}?overview=full&geometries=geojson&steps=true`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch {
    throw new RoutingError("network");
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 429) throw new RoutingError("rate-limit");

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new RoutingError("unknown");
  }
  if (!isRecord(body)) throw new RoutingError("unknown");

  // NoRoute: no path between the points; NoSegment: a point is too far from any road
  if (body.code === "NoRoute" || body.code === "NoSegment") throw new RoutingError("no-route");
  if (!response.ok || body.code !== "Ok" || !Array.isArray(body.routes)) throw new RoutingError("unknown");

  const first: unknown = body.routes[0];
  if (!isOsrmRoute(first)) throw new RoutingError("no-route");

  // OSRM snaps each point to the nearest road, however far away (even from the
  // middle of Manila Bay). `waypoints[].distance` is that snap distance in meters.
  const tooFarFromRoad =
    Array.isArray(body.waypoints) &&
    body.waypoints.some((w) => isRecord(w) && typeof w.distance === "number" && w.distance > MAX_SNAP_METERS);
  if (tooFarFromRoad) throw new RoutingError("no-route");

  return toRoute(first, profile);
}

/**
 * Route from `from` to `to`. Cached in memory for 10 minutes; identical
 * concurrent requests share one fetch. Throws RoutingError.
 */
export async function getRoute(from: LatLng, to: LatLng, profile: RouteProfile = "foot"): Promise<Route> {
  const key = cacheKey(from, to, profile);

  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.route;

  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = requestRoute(from, to, profile)
    .then((route) => {
      cache.set(key, { route, at: Date.now() });
      // Drop the oldest entry when full (Map keeps insertion order)
      if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value ?? key);
      return route;
    })
    .finally(() => inflight.delete(key));

  inflight.set(key, promise);
  return promise;
}
