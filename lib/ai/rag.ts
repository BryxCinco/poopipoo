import type { SupabaseClient } from "@supabase/supabase-js";

import { EmbeddingError, generateEmbedding } from "@/lib/ai/embeddings";
import { PLACE_ALIASES } from "@/lib/ai/restroom-document";
import { calculateDistance, formatDistance } from "@/lib/distance";
import { getAmenityLabel, getDisplayAmenities } from "@/lib/icons";
import { RESTROOM_COLUMNS, rowToRestroom } from "@/lib/restrooms/mappers";
import { createClient } from "@/lib/supabase/server";
import type { RankedRestroom } from "@/types/agent";
import type { Database } from "@/types/database";
import type { LatLng } from "@/types/geo";
import type { Amenity, Restroom } from "@/types/restroom";

/**
 * Retrieval for the AI agent (the "R" in RAG). Server-only.
 *
 * Two ways to find restrooms:
 * - relevance: embed the query and run the match_restrooms() vector search
 *   (good for "may bidet sa BGC", "malinis na CR sa mall").
 * - distance: nearest restrooms to the user (good for "pinakamalapit na CR");
 *   a vector search can't know where "near me" is, so this skips embeddings.
 * Amenity/price filters apply to both.
 *
 * If the embedding service is down, relevance search falls back to a simple
 * keyword match on name/address/description, so the agent still works.
 */

export interface SearchFilters {
  isFree?: boolean;
  amenities?: Amenity[];
}

export interface SearchOptions {
  limit?: number;
  /** Minimum cosine similarity (0–1) for the vector search */
  threshold?: number;
  filters?: SearchFilters;
  /** User's location, for distances and "distance" sorting */
  location?: LatLng | null;
  sortBy?: "relevance" | "distance";
  /** Defaults to the signed-in user's server client (RLS applies) */
  client?: SupabaseClient<Database>;
}

export type { RankedRestroom };

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 10;
// all-MiniLM-L6-v2 scores related short texts around 0.3–0.7; below ~0.2 is noise
const DEFAULT_THRESHOLD = 0.2;
// "Nearest" search box around the user (~30 km), so it doesn't scan the whole country
const NEARBY_DEGREES = 0.27;

function matchesFilters(restroom: Restroom, filters: SearchFilters | undefined): boolean {
  if (!filters) return true;
  if (filters.isFree !== undefined && restroom.isFree !== filters.isFree) return false;
  return (filters.amenities ?? []).every((amenity) => restroom.amenities.includes(amenity));
}

function withDistance(restroom: Restroom, similarity: number | null, location: LatLng | null | undefined): RankedRestroom {
  const distanceKm = location
    ? calculateDistance(location.latitude, location.longitude, restroom.latitude, restroom.longitude)
    : null;
  return { ...restroom, similarity, distanceKm };
}

/** Restrooms matching a natural-language query (and filters), best first. */
export async function searchRestrooms(query: string, options: SearchOptions = {}): Promise<RankedRestroom[]> {
  const limit = Math.min(Math.max(options.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const { filters, location } = options;
  const supabase = options.client ?? createClient();

  if (options.sortBy === "distance" && location) {
    return findNearestRestrooms(supabase, location, filters, limit);
  }

  let results: RankedRestroom[];
  try {
    const embedding = await generateEmbedding(query);
    const { data, error } = await supabase.rpc("match_restrooms", {
      query_embedding: embedding,
      match_threshold: options.threshold ?? DEFAULT_THRESHOLD,
      // Fetch extra so there's still enough left after filtering
      match_count: filters ? 50 : limit * 3,
    });
    if (error) throw new Error(`Vector search failed: ${error.message}`);
    results = data.map(({ similarity, ...row }) => withDistance(rowToRestroom(row), similarity, location));
  } catch (error) {
    console.warn("Vector search unavailable, using keyword search:", error instanceof EmbeddingError ? error.kind : error);
    results = await keywordSearch(supabase, query, location);
  }

  results = results.filter((restroom) => matchesFilters(restroom, filters));

  if (options.sortBy === "distance") {
    results.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  }
  return results.slice(0, limit);
}

// Words that say nothing about *which* restroom (amenities/price go through filters)
const STOPWORDS = new Set(
  (
    "restroom restrooms toilet toilets comfort room rooms public free paid with near nearby the and for " +
    "in at of a an is are any where which clean city libre bayad may mga ang sa na ba ng saan malapit"
  ).split(" ")
);

/** Search terms from a query: place words, plus abbreviations for full place names. */
function keywordTerms(query: string): string[] {
  const lower = query.toLowerCase();
  const terms = new Set(lower.split(/[^a-z0-9ñ]+/).filter((term) => term.length >= 3 && !STOPWORDS.has(term)));
  // "Bonifacio Global City" in the query should also match "BGC" in addresses
  PLACE_ALIASES.forEach(({ short, full }) => {
    if (lower.includes(full.toLowerCase())) terms.add(short.toLowerCase());
  });
  return Array.from(terms).slice(0, 8);
}

/** Fallback when embeddings are unavailable: rows containing any term, most matches first. */
async function keywordSearch(
  supabase: SupabaseClient<Database>,
  query: string,
  location: LatLng | null | undefined
): Promise<RankedRestroom[]> {
  const terms = keywordTerms(query);
  if (terms.length === 0) return [];

  // Terms only contain [a-z0-9ñ], so they're safe inside the PostgREST or() filter
  const conditions = terms.flatMap((term) =>
    ["name", "address", "description"].map((column) => `${column}.ilike.%${term}%`)
  );
  const { data, error } = await supabase.from("restrooms").select(RESTROOM_COLUMNS).or(conditions.join(",")).limit(100);
  if (error) throw new Error(`Keyword search failed: ${error.message}`);

  const score = (restroom: Restroom) => {
    const text = `${restroom.name} ${restroom.address} ${restroom.description}`.toLowerCase();
    return terms.filter((term) => text.includes(term)).length;
  };
  return data
    .map((row) => rowToRestroom(row))
    .map((restroom) => ({ restroom, score: score(restroom) }))
    .sort((a, b) => b.score - a.score)
    .map(({ restroom }) => withDistance(restroom, null, location));
}

/** Nearest restrooms within ~30 km, filtered in the database where possible. */
async function findNearestRestrooms(
  supabase: SupabaseClient<Database>,
  location: LatLng,
  filters: SearchFilters | undefined,
  limit: number
): Promise<RankedRestroom[]> {
  let query = supabase
    .from("restrooms")
    .select(RESTROOM_COLUMNS)
    .gte("latitude", location.latitude - NEARBY_DEGREES)
    .lte("latitude", location.latitude + NEARBY_DEGREES)
    .gte("longitude", location.longitude - NEARBY_DEGREES)
    .lte("longitude", location.longitude + NEARBY_DEGREES)
    .limit(500);
  if (filters?.isFree !== undefined) query = query.eq("is_free", filters.isFree);
  if (filters?.amenities?.length) query = query.contains("amenities", filters.amenities);

  const { data, error } = await query;
  if (error) throw new Error(`Nearby search failed: ${error.message}`);

  return data
    .map((row) => withDistance(rowToRestroom(row), null, location))
    .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
    .slice(0, limit);
}

/**
 * Formats restrooms as compact text for the LLM (the "A" in RAG).
 * Includes the id so the model can call get_distance / start_navigation.
 */
export function buildContext(restrooms: RankedRestroom[]): string {
  if (restrooms.length === 0) return "Walang nahanap na CR na tugma. Sabihin ito sa user; huwag mag-imbento ng CR.";

  const list = restrooms
    .map((restroom, index) => {
      const amenities = getDisplayAmenities(restroom.amenities).map(getAmenityLabel);
      const parts = [
        `${index + 1}. ${restroom.name} (id: ${restroom.id})`,
        `Address: ${restroom.address}`,
        restroom.isFree ? "Libre" : "May bayad",
        `Amenities: ${amenities.length > 0 ? amenities.join(", ") : "wala nakalista"}`,
        restroom.reviewCount > 0
          ? `Rating: ${restroom.rating.toFixed(1)}/5 (${restroom.reviewCount} review)`
          : "Rating: wala pang review",
      ];
      if (restroom.distanceKm !== null) parts.push(`Layo: ${formatDistance(restroom.distanceKm)} (tuwid na linya)`);
      if (restroom.description) parts.push(`Paglalarawan: ${restroom.description.slice(0, 160)}`);
      return parts.join(" | ");
    })
    .join("\n");
  // Grounding reminder: the model must not add restrooms or amenities from its own knowledge
  return `${list}\n(Ito LANG ang mga CR na tugma. Huwag magdagdag ng iba o ng amenities na wala rito.)`;
}
