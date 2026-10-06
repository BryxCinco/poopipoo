import { cache } from "react";

import { isUuid, RESTROOM_COLUMNS, rowToRestroom } from "@/lib/restrooms/mappers";
import { createClient } from "@/lib/supabase/server";
import type { Restroom } from "@/types/restroom";

/**
 * Server-side restroom lookup (RLS applies as the current user).
 * Wrapped in React `cache` so generateMetadata and the page share one query.
 * Returns null when the id isn't a UUID or no row exists; throws on DB errors
 * (caught by the nearest error.tsx).
 */
export const getRestroomByIdServer = cache(async (id: string): Promise<Restroom | null> => {
  if (!isUuid(id)) return null;

  const { data, error } = await createClient()
    .from("restrooms")
    .select(RESTROOM_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Failed to load restroom: ${error.message}`);
  return data ? rowToRestroom(data) : null;
});
