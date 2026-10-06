import { createAdminClient } from "@/lib/supabase/admin";
import { EmbeddingError, generateEmbedding, toPgVector } from "@/lib/ai/embeddings";
import type { RestroomRow } from "@/types/database";

/**
 * The text that gets embedded for each restroom ("document").
 *
 * No chunking: a restroom is short (name + description ≤ 500 chars + address +
 * amenities), so one vector per restroom. The embedding model is English, so
 * amenities are spelled out in English (with the Filipino word where people
 * use it), and common place abbreviations get their full names too.
 */

type DocumentFields = Pick<RestroomRow, "name" | "description" | "address" | "amenities" | "is_free">;

const AMENITY_TEXT: Record<string, string> = {
  bidet: "bidet",
  tissue: "toilet paper (tissue)",
  soap: "soap (sabon)",
  wheelchair: "wheelchair accessible, PWD friendly",
  "baby-changing": "baby changing station",
  shower: "shower",
  "air-conditioned": "air-conditioned (aircon)",
};

/** Common place abbreviations (also used by the keyword search fallback). */
export const PLACE_ALIASES: { short: string; full: string }[] = [
  { short: "BGC", full: "Bonifacio Global City" },
  { short: "QC", full: "Quezon City" },
  { short: "MOA", full: "Mall of Asia" },
];

const usesAbbreviation = (text: string, short: string) => new RegExp(`\\b${short}\\b`, "i").test(text);

export function restroomToDocument(restroom: DocumentFields): string {
  const amenities = restroom.amenities
    .filter((amenity) => amenity !== "free")
    .map((amenity) => AMENITY_TEXT[amenity] ?? amenity);
  // Full names for abbreviations in the address (e.g. "BGC" → "Bonifacio Global City")
  const aliases = PLACE_ALIASES.filter(({ short }) => usesAbbreviation(restroom.address, short)).map(({ full }) => full);

  return [
    `${restroom.name}.`,
    restroom.description.trim(),
    `Location: ${restroom.address}${aliases.length > 0 ? ` (${aliases.join(", ")})` : ""}.`,
    amenities.length > 0 ? `Amenities: ${amenities.join(", ")}.` : "No listed amenities.",
    restroom.is_free ? "Free public restroom (libre)." : "Paid restroom (may bayad).",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Embeds restrooms that don't have an embedding yet (newly added, or edited —
 * a DB trigger clears the embedding when the text changes). Uses the secret
 * key because users can't write the embedding column. Server-only.
 *
 * Called in the background by the agent so new restrooms become searchable
 * without re-running the script. Returns how many were embedded; never throws.
 */
export async function embedMissingRestrooms(limit = 3): Promise<number> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("restrooms")
      .select("id, name, description, address, amenities, is_free")
      .is("embedding", null)
      .limit(limit);
    if (error || !data) return 0;

    let count = 0;
    for (const row of data) {
      const vector = await generateEmbedding(restroomToDocument(row));
      const { error: updateError } = await supabase
        .from("restrooms")
        .update({ embedding: toPgVector(vector) })
        .eq("id", row.id);
      if (!updateError) count++;
    }
    return count;
  } catch (error) {
    if (!(error instanceof EmbeddingError)) console.error("embedMissingRestrooms failed", error);
    return 0;
  }
}
