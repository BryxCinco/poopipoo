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
}

// Re-fetch when the cached list is older than this (picks up other people's additions).
const STALE_AFTER_MS = 60_000;

const SERVER_STATE: RestroomStoreState = { restrooms: [], status: "idle", error: null, loaded: false };

let state: RestroomStoreState = SERVER_STATE;
let fetchedAt = 0;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function setState(partial: Partial<RestroomStoreState>): void {
  state = { ...state, ...partial };
  listeners.forEach((listener) => listener());
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "Unknown error";

// ---------- reads ----------

/** Loads (or reloads) all restrooms. Concurrent calls share one request. */
export function fetchRestrooms(): Promise<void> {
  if (inflight) return inflight;

  setState({ status: "loading", error: null });
  inflight = (async () => {
    try {
      const { data, error } = await createClient()
        .from("restrooms")
        .select(RESTROOM_COLUMNS)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);

      fetchedAt = Date.now();
      setState({ restrooms: data.map(rowToRestroom), status: "success", loaded: true });
    } catch (error) {
      setState({ status: "error", error: errorMessage(error) });
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Fetches if never loaded, after an error, or when the cache is stale. */
export function ensureFreshRestrooms(): void {
  const stale = Date.now() - fetchedAt > STALE_AFTER_MS;
  if (state.status === "idle" || (state.status !== "loading" && stale)) {
    void fetchRestrooms();
  }
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
