import type { City } from "@/lib/cities";
import { createAnonClient } from "@/lib/supabase/anon";

/**
 * Server only. Restrooms inside a city's bounding box, as any visitor sees
 * them (guest access: rejected restrooms are hidden by RLS and filtered here).
 */

export interface CityRestroom {
  id: string;
  name: string;
  address: string;
  rating: number;
  review_count: number;
  is_free: boolean;
}

function inCity(city: City) {
  const { south, west, north, east } = city.bounds;
  return createAnonClient()
    .from("restrooms")
    .select("id, name, address, rating, review_count, is_free", { count: "exact" })
    .gte("latitude", south)
    .lte("latitude", north)
    .gte("longitude", west)
    .lte("longitude", east)
    .neq("status", "rejected");
}

/** Top-rated restrooms (then most reviewed, then by name) plus the total count. */
export async function getCityRestrooms(city: City, limit: number): Promise<{ restrooms: CityRestroom[]; total: number }> {
  const { data, count, error } = await inCity(city)
    .order("rating", { ascending: false })
    .order("review_count", { ascending: false })
    .order("name", { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  return { restrooms: data, total: count ?? data.length };
}

/** Number of restrooms per city slug; 0 when a count fails (it's only a label). */
export async function countRestroomsByCity(cities: readonly City[]): Promise<Record<string, number>> {
  const counts = await Promise.all(
    cities.map(async (city) => {
      const { count, error } = await inCity(city).limit(0);
      return [city.slug, error ? 0 : (count ?? 0)] as const;
    })
  );
  return Object.fromEntries(counts);
}
