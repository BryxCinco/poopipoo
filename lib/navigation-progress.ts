import { distance, length, lineString, nearestPointOnLine, point } from "@turf/turf";
import type { Feature, LineString } from "geojson";

import type { Route } from "@/lib/routing";
import type { LatLng } from "@/types/geo";

/**
 * Where the user is along a route, computed with turf:
 * snap the GPS position onto the route line, then measure along it.
 */

export interface NavigationProgress {
  /** GPS position snapped onto the route line */
  snapped: LatLng;
  /** How far the GPS position is from the route line (meters) */
  offRouteMeters: number;
  /** Meters left along the route */
  remainingDistance: number;
  /** Seconds left (route duration scaled by remaining distance) */
  remainingDuration: number;
  /** Index of the step the user is currently on */
  stepIndex: number;
  /** Index of the upcoming maneuver (what to show/announce), or null after the last one */
  nextStepIndex: number | null;
  /** Meters to the upcoming maneuver */
  distanceToNextManeuver: number;
  /** Straight-line meters to the destination */
  distanceToDestination: number;
}

interface PreparedRoute {
  line: Feature<LineString>;
  /** Length of the drawn line in meters */
  lineLength: number;
  /** Meters along the line where each step's maneuver happens */
  stepStarts: number[];
}

// Route objects are immutable, so the turf line and step offsets are computed once per route
const prepared = new WeakMap<Route, PreparedRoute>();

function prepare(route: Route): PreparedRoute {
  const existing = prepared.get(route);
  if (existing) return existing;

  const line = lineString(route.geometry.coordinates);
  const lineLength = length(line, { units: "meters" });

  // OSRM step distances add up to (roughly) the route distance; scale them to the
  // drawn line's length so step positions line up with the snapped position.
  const totalStepDistance = route.steps.reduce((sum, step) => sum + step.distance, 0) || 1;
  const scale = lineLength / totalStepDistance;
  const stepStarts: number[] = [];
  let acc = 0;
  for (const step of route.steps) {
    stepStarts.push(acc * scale);
    acc += step.distance;
  }

  const result = { line, lineLength, stepStarts };
  prepared.set(route, result);
  return result;
}

const toPoint = ({ latitude, longitude }: LatLng) => point([longitude, latitude]);

export function computeProgress(route: Route, position: LatLng, destination: LatLng): NavigationProgress {
  const { line, lineLength, stepStarts } = prepare(route);

  const nearest = nearestPointOnLine(line, toPoint(position), { units: "meters" });
  const along = Math.min(nearest.properties.location, lineLength);
  const [snappedLng, snappedLat] = nearest.geometry.coordinates;

  // Current step = last maneuver we've passed
  let stepIndex = 0;
  for (let i = 0; i < stepStarts.length; i++) {
    if (stepStarts[i] <= along) stepIndex = i;
  }
  const nextStepIndex = stepIndex + 1 < route.steps.length ? stepIndex + 1 : null;

  const remainingDistance = Math.max(0, lineLength - along);
  const ratio = lineLength > 0 ? remainingDistance / lineLength : 0;

  return {
    snapped: { latitude: snappedLat, longitude: snappedLng },
    offRouteMeters: nearest.properties.dist,
    remainingDistance,
    remainingDuration: route.duration * ratio,
    stepIndex,
    nextStepIndex,
    distanceToNextManeuver:
      nextStepIndex !== null ? Math.max(0, stepStarts[nextStepIndex] - along) : remainingDistance,
    distanceToDestination: distance(toPoint(position), toPoint(destination), { units: "meters" }),
  };
}
