import {
  newRestroomToInsert,
  RESTROOM_COLUMNS,
  rowToRestroom,
  type NewRestroom,
} from "@/lib/restrooms/mappers";
import { LocalizedError } from "@/lib/i18n/errors";
import { toAppError } from "@/lib/moderation/errors";
import { createClient } from "@/lib/supabase/client";
import type { Restroom } from "@/types/restroom";

/**
 * Client-side cache of restrooms from Supabase, shared by the map and list.
 *
 * - Holds the restrooms inside one area (a bounding box): the map's view, or
 *   the area around the user on the list. Never the whole table: Supabase
 *   returns at most 1000 rows, so a full load would silently drop restrooms.
 * - At most MAX_RESTROOMS_PER_VIEW per area; `truncated` says there are more
 *   (the map asks the user to zoom in).
 * - Exposes `subscribe` + `getSnapshot` for React's `useSyncExternalStore`.
 * - The snapshot object only changes when data/status changes (a new object on
 *   every call would make useSyncExternalStore re-render forever).
 * - Deletes are optimistic (removed right away, restored if the server refuses).
 * - Writes go through RLS: the signed-in user can only add/delete their own rows.
 */

export type StoreStatus = "idle" | "loading" | "success" | "error";

export interface RestroomStoreState {
  restrooms: Restroom[];
  status: StoreStatus;
  error: string | null;
  /** True once the first fetch succeeded (refetches don't show skeletons again). */
  loaded: boolean;
  /** The area has more than MAX_RESTROOMS_PER_VIEW restrooms; only those were loaded. */
  truncated: boolean;
}

/** Bounding box in degrees. */
export interface MapBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

/** Pins per area: enough for a city view, light enough for a phone. */
export const MAX_RESTROOMS_PER_VIEW = 200;

// Re-fetch when the cached area is older than this (picks up other people's additions).
const STALE_AFTER_MS = 60_000;

const SERVER_STATE: RestroomStoreState = {
  restrooms: [],
  status: "idle",
  error: null,
  loaded: false,
  truncated: false,
};

let state: RestroomStoreState = SERVER_STATE;
let fetchedAt = 0;
/** Area of the current `restrooms` (null before the first successful fetch). */
let fetchedBounds: MapBounds | null = null;
/** Area of the newest request (what retry fetches again). */
let requestedBounds: MapBounds | null = null;
let controller: AbortController | null = null;
const listeners = new Set<() => void>();

function setState(partial: Partial<RestroomStoreState>): void {
  state = { ...state, ...partial };
  listeners.forEach((listener) => listener());
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "Unknown error";

// ---------- reads ----------

const contains = (outer: MapBounds, inner: MapBounds): boolean =>
  inner.south >= outer.south && inner.north <= outer.north && inner.west >= outer.west && inner.east <= outer.east;

/** Square area about `radiusKm` from the center in each direction. */
export function boundsAround(center: { latitude: number; longitude: number }, radiusKm: number): MapBounds {
  const latDelta = radiusKm / 111; // ~111 km per degree of latitude
  const lngDelta = radiusKm / (111 * Math.cos((center.latitude * Math.PI) / 180));
  return {
    south: center.latitude - latDelta,
    north: center.latitude + latDelta,
    west: center.longitude - lngDelta,
    east: center.longitude + lngDelta,
  };
}

/**
 * Loads the restrooms inside `bounds`, replacing the current ones.
 * A newer call cancels an older one that is still running.
 * The most reviewed come first, so a busy area keeps its best-known restrooms.
 */
export function fetchRestroomsInBounds(bounds: MapBounds): Promise<void> {
  controller?.abort();
  const current = new AbortController();
  controller = current;
  requestedBounds = bounds;

  setState({ status: "loading", error: null });
  return (async () => {
    try {
      const { data, error } = await createClient()
        .from("restrooms")
        .select(RESTROOM_COLUMNS)
        .gte("latitude", bounds.south)
        .lte("latitude", bounds.north)
        .gte("longitude", bounds.west)
        .lte("longitude", bounds.east)
        .order("review_count", { ascending: false })
        .order("created_at", { ascending: false })
        // One extra row tells us whether the area has more than the cap
        .limit(MAX_RESTROOMS_PER_VIEW + 1)
        .abortSignal(current.signal);
      if (current.signal.aborted) return;
      if (error) throw new Error(error.message);

      fetchedAt = Date.now();
      fetchedBounds = bounds;
      setState({
        restrooms: data.slice(0, MAX_RESTROOMS_PER_VIEW).map(rowToRestroom),
        truncated: data.length > MAX_RESTROOMS_PER_VIEW,
        status: "success",
        loaded: true,
      });
    } catch (error) {
      if (current.signal.aborted) return;
      setState({ status: "error", error: errorMessage(error) });
    } finally {
      if (controller === current) controller = null;
    }
  })();
}

/**
 * Fetches `bounds` unless the loaded area already covers it, is fresh, and was
 * complete (a truncated area can show more restrooms in a smaller view).
 */
export function ensureRestroomsInBounds(bounds: MapBounds): void {
  const fresh = Date.now() - fetchedAt <= STALE_AFTER_MS;
  const covered =
    fetchedBounds !== null && contains(fetchedBounds, bounds) && !state.truncated && state.status === "success";
  if (fresh && covered) return;
  // Same area already on its way
  if (state.status === "loading" && requestedBounds !== null && contains(requestedBounds, bounds)) return;
  void fetchRestroomsInBounds(bounds);
}

/** Fetches the last requested area again (retry button). */
export function refetchRestrooms(): Promise<void> {
  return requestedBounds ? fetchRestroomsInBounds(requestedBounds) : Promise.resolve();
}

/**
 * Marks the cache stale so the map/list refetch on their next visit
 * (e.g. after a review changed a restroom's rating on the server).
 */
export function invalidateRestrooms(): void {
  fetchedAt = 0;
}

export function getAllRestrooms(): Restroom[] {
  return state.restrooms;
}

/** From cache if possible, otherwise one request. null if it doesn't exist. */
export async function getRestroomById(id: string): Promise<Restroom | null> {
  const cached = state.restrooms.find((restroom) => restroom.id === id);
  if (cached) return cached;

  const { data, error } = await createClient().from("restrooms").select(RESTROOM_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToRestroom(data) : null;
}

// ---------- writes ----------

/** Inserts a restroom owned by `userId` (must be the signed-in user — RLS checks). */
export async function addRestroom(data: NewRestroom, userId: string): Promise<Restroom> {
  const { data: row, error } = await createClient()
    .from("restrooms")
    .insert(newRestroomToInsert(data, userId))
    .select(RESTROOM_COLUMNS)
    .single();
  // Rate limit / ban → RateLimitError / BannedError (see lib/moderation/errors.ts)
  if (error) throw toAppError(error);

  const restroom = rowToRestroom(row);
  setState({ restrooms: [restroom, ...state.restrooms] });
  return restroom;
}

/**
 * Uploads restrooms one at a time, in order (used for localStorage restrooms).
 * Each one counts toward the rate limit, so it stops at the first error:
 * `saved` = how many from the start of the list were saved, `error` = what stopped it.
 */
export async function addRestrooms(
  items: NewRestroom[],
  userId: string
): Promise<{ saved: number; error: Error | null }> {
  let saved = 0;
  for (const item of items) {
    try {
      await addRestroom(item, userId);
      saved++;
    } catch (error) {
      return { saved, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }
  return { saved, error: null };
}

/**
 * Optimistically removes the restroom, then deletes it on the server.
 * Restores it and throws if the delete fails or RLS matched no row (not the owner).
 */
export async function removeRestroom(id: string): Promise<void> {
  const previous = state.restrooms;
  setState({ restrooms: previous.filter((restroom) => restroom.id !== id) });

  const { data, error } = await createClient().from("restrooms").delete().eq("id", id).select("id");

  if (error || data.length === 0) {
    // Only roll back if nothing else changed the list meanwhile
    if (state.restrooms !== previous) setState({ restrooms: previous });
    throw error ? toAppError(error) : new LocalizedError("restroomDeleteForbidden");
  }
}

// ---------- useSyncExternalStore plumbing ----------

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getSnapshot = (): RestroomStoreState => state;

/** Server render + hydration: nothing loaded yet. */
export const getServerSnapshot = (): RestroomStoreState => SERVER_STATE;
