/**
 * Seeds the 10 mock restrooms into Supabase.
 *
 *   npx tsx scripts/seed-restrooms.ts
 *
 * Uses the secret key (bypasses RLS). Idempotent: restrooms whose name already
 * exists as a seeded row (created_by IS NULL) are skipped, so it's safe to re-run.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { MOCK_RESTROOMS } from "@/lib/mock-restrooms";
import type { RestroomInsert } from "@/types/database";

// Node 20.12+: load .env.local since this runs outside Next.js
process.loadEnvFile(".env.local");

async function main(): Promise<void> {
  const supabase = createAdminClient();

  const { data: existing, error: readError } = await supabase
    .from("restrooms")
    .select("name")
    .is("created_by", null);
  if (readError) throw new Error(`Could not read restrooms: ${readError.message}`);

  const existingNames = new Set(existing.map((row) => row.name));
  const toInsert: RestroomInsert[] = MOCK_RESTROOMS.filter((r) => !existingNames.has(r.name)).map(
    (r) => ({
      name: r.name,
      description: r.description,
      address: r.address,
      latitude: r.latitude,
      longitude: r.longitude,
      amenities: r.amenities,
      is_free: r.isFree,
      images: r.images,
      // rating/review_count are computed from real reviews by a trigger (0002_reviews.sql)
      created_by: null,
      created_at: r.createdAt,
    })
  );

  if (toInsert.length === 0) {
    console.log("Nothing to insert — all mock restrooms are already seeded.");
  } else {
    const { error: insertError } = await supabase.from("restrooms").insert(toInsert);
    if (insertError) throw new Error(`Insert failed: ${insertError.message}`);
    console.log(`Inserted ${toInsert.length} restroom(s).`);
  }

  // Equivalent of: SELECT COUNT(*) FROM restrooms;
  const { count, error: countError } = await supabase
    .from("restrooms")
    .select("*", { count: "exact", head: true });
  if (countError) throw new Error(`Count failed: ${countError.message}`);
  console.log(`SELECT COUNT(*) FROM restrooms; → ${count}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
