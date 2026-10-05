import {
  newRestroomToInsert,
  rowToRestroom,
  type NewRestroom,
} from "@/lib/restrooms/mappers";
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
        .select("*")
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

export function getAllRestrooms(): Restroom[] {
  return state.restrooms;
}

/** From cache if possible, otherwise one request. null if it doesn't exist. */
export async function getRestroomById(id: string): Promise<Restroom | null> {
  const cached = state.restrooms.find((restroom) => restroom.id === id);
  if (cached) return cached;

  const { data, error } = await createClient().from("restrooms").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToRestroom(data) : null;
}

// ---------- writes ----------

/** Inserts a restroom owned by `userId` (must be the signed-in user — RLS checks). */
export async function addRestroom(data: NewRestroom, userId: string): Promise<Restroom> {
  const { data: row, error } = await createClient()
    .from("restrooms")
    .insert(newRestroomToInsert(data, userId))
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  const restroom = rowToRestroom(row);
  setState({ restrooms: [restroom, ...state.restrooms] });
  return restroom;
}

/** Bulk insert (used to upload localStorage restrooms). Returns how many were saved. */
export async function addRestrooms(items: NewRestroom[], userId: string): Promise<number> {
  if (items.length === 0) return 0;

  const { data: rows, error } = await createClient()
    .from("restrooms")
    .insert(items.map((item) => newRestroomToInsert(item, userId)))
    .select("*");
  if (error) throw new Error(error.message);

  setState({ restrooms: [...rows.map(rowToRestroom), ...state.restrooms] });
  return rows.length;
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
    throw new Error(error?.message ?? "Hindi mo pwedeng burahin ang CR na ito.");
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
