/**
 * Corrects restrooms already imported from OpenStreetMap:
 *   - is_free comes from the real OSM fee tag; no tag means null, not free
 *     (and the "free" amenity follows it)
 *   - removes the filler "Mula sa OpenStreetMap." from descriptions
 *   - removes generic leading address parts ("women, Parade Loop, ...")
 *
 *   npx tsx scripts/backfill-osm-accuracy.ts                             # show the changes, no writes
 *   npx tsx scripts/backfill-osm-accuracy.ts --apply --backup=<file.json>  # save old values, then write
 *
 * Needs migration 0011 first. Only touches source = 'osm' rows, and is safe to
 * re-run. These edits clear the embeddings (DB trigger), so run
 * scripts/generate-embeddings.ts --missing afterwards.
 */
import { writeFileSync } from "node:fs";

import { cleanAddress, fetchOsmTagsById, parseFee } from "@/lib/osm";
import { createAdminClient } from "@/lib/supabase/admin";

// Node 20.12+: load .env.local since this runs outside Next.js
process.loadEnvFile(".env.local");

const APPLY = process.argv.includes("--apply");
const BACKUP = process.argv.find((arg) => arg.startsWith("--backup="))?.slice("--backup=".length);
const USER_AGENT = "Poopipoo/1.0 (restroom finder; +https://poopipoo.vercel.app)";
const FILLER = /\s*Mula sa OpenStreetMap\.\s*$/;
// Far fewer elements than expected means a bad Overpass answer, not deleted toilets
const MIN_FOUND_RATIO = 0.8;

type OldRow = {
  id: string;
  name: string;
  address: string;
  description: string;
  is_free: boolean | null;
  amenities: string[];
  osm_type: string | null;
  osm_id: string | null;
};

async function main(): Promise<void> {
  if (APPLY && !BACKUP) throw new Error("--apply needs --backup=<file.json>");
  const supabase = createAdminClient();

  const rows: OldRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("restrooms")
      .select("id, name, address, description, is_free, amenities, osm_type, osm_id")
      .eq("source", "osm")
      .order("id")
      .range(from, from + 999);
    if (error) throw new Error(`Could not read restrooms: ${error.message}`);
    rows.push(...(data as OldRow[]));
    if (data.length < 1000) break;
  }

  const linked = rows.filter((row) => row.osm_type && row.osm_id);
  const tagsById = await fetchOsmTagsById(
    linked.map((row) => ({ osmType: row.osm_type as string, osmId: row.osm_id as string })),
    USER_AGENT
  );
  if (tagsById.size < linked.length * MIN_FOUND_RATIO) {
    throw new Error(`Overpass returned only ${tagsById.size} of ${linked.length} elements. Nothing written; try again.`);
  }

  const changes = rows.map((row) => {
    const tags = tagsById.get(`${row.osm_type}/${row.osm_id}`) ?? {};
    const isFree = parseFee(tags);
    const others = row.amenities.filter((amenity) => amenity !== "free");
    return {
      old: row,
      next: {
        is_free: isFree,
        amenities: isFree === true ? [...others, "free"] : others,
        description: row.description.replace(FILLER, "").trim(),
        address: cleanAddress(row.address),
      },
    };
  });

  const sameAmenities = (a: string[], b: string[]) => a.length === b.length && a.every((value) => b.includes(value));
  const toWrite = changes.filter(
    ({ old, next }) =>
      old.is_free !== next.is_free ||
      !sameAmenities(old.amenities, next.amenities) ||
      old.description !== next.description ||
      old.address !== next.address
  );

  const count = (test: (next: (typeof changes)[number]["next"]) => boolean) => changes.filter(({ next }) => test(next)).length;
  console.log(`OSM restrooms: ${rows.length}; found in OSM now: ${tagsById.size}`);
  console.log(`Fee after: confirmed free ${count((n) => n.is_free === true)}, paid ${count((n) => n.is_free === false)}, unknown ${count((n) => n.is_free === null)}`);
  console.log(`Descriptions changed: ${changes.filter(({ old, next }) => old.description !== next.description).length}; empty after: ${count((n) => n.description === "")}`);
  const addressChanges = changes.filter(({ old, next }) => old.address !== next.address);
  console.log(`Addresses changed: ${addressChanges.length}`);
  addressChanges.forEach(({ old, next }) => console.log(`  "${old.address}" -> "${next.address}"`));
  const newlyPaid = changes.filter(({ old, next }) => old.is_free !== false && next.is_free === false);
  console.log(`Free before, paid now: ${newlyPaid.length}`);
  newlyPaid.forEach(({ old }) => console.log(`  ${old.name}`));
  console.log(`Rows to update: ${toWrite.length}`);

  if (!APPLY) {
    console.log("\nDry run: nothing written.");
    return;
  }

  writeFileSync(BACKUP as string, JSON.stringify(toWrite.map(({ old }) => old), null, 1));
  console.log(`Old values saved to ${BACKUP}`);

  let done = 0;
  for (const { old, next } of toWrite) {
    const { error } = await supabase.from("restrooms").update(next).eq("id", old.id);
    if (error) {
      const hint = error.message.includes("is_free") ? " (Has migration 0011 been run?)" : "";
      throw new Error(`Stopped after ${done} rows at ${old.name}: ${error.message}${hint}`);
    }
    done++;
  }
  console.log(`Updated ${done} rows. Now run: npx tsx scripts/generate-embeddings.ts --missing`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
