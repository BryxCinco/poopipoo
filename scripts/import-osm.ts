/**
 * Imports public restrooms (amenity=toilets) in Metro Manila from
 * OpenStreetMap into Supabase.
 *
 *   npx tsx scripts/import-osm.ts              # import
 *   npx tsx scripts/import-osm.ts --dry-run    # fetch + show what would happen, no writes
 *   npx tsx scripts/import-osm.ts --no-geocode # skip filling missing addresses
 *
 * Requires migration 0006_osm.sql. Uses the secret key (bypasses RLS and the
 * Phase 11 rate limit, which only applies to signed-in users).
 *
 * Duplicates are skipped:
 * - an OSM element that's already imported (unique osm_type + osm_id),
 * - an OSM restroom within 30 m of an existing app/seed restroom with a
 *   similar name (or no name of its own): the existing one is kept, since it
 *   may already have reviews.
 *
 * Imported rows: status 'approved', created_by NULL, source 'osm',
 * ai_checked_at now() (so they don't fill the moderation dashboard).
 *
 * Data © OpenStreetMap contributors, ODbL 1.0 — credited on the About page
 * and on each imported restroom's page.
 */
import { reverseGeocode } from "@/lib/geocode";
import { distanceMeters, fetchOsmRestrooms, normalizeName, type OsmRestroom } from "@/lib/osm";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RestroomInsert } from "@/types/database";

// Node 20.12+: load .env.local since this runs outside Next.js
process.loadEnvFile(".env.local");

const DRY_RUN = process.argv.includes("--dry-run");
const GEOCODE = !process.argv.includes("--no-geocode");

// Overpass and Nominatim ask scripts to identify themselves
const USER_AGENT = "Poopipoo/1.0 (restroom finder; +https://poopipoo.vercel.app)";
const DUPLICATE_RADIUS_M = 30;
const BATCH_SIZE = 100;
// Nominatim usage policy: at most 1 request per second
const GEOCODE_DELAY_MS = 1100;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Same place by name? Word overlap, or one name contains the other. */
function similarNames(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  if (na.includes(nb) || nb.includes(na)) return true;
  // Generic words say nothing about which place it is
  const generic = new Set(["cr", "restroom", "toilet", "toilets", "comfort", "room", "public", "floor", "the", "of"]);
  const words = (s: string) => new Set(s.split(" ").filter((w) => w.length > 1 && !generic.has(w)));
  const wa = words(na);
  const wb = words(nb);
  if (wa.size === 0 || wb.size === 0) return false;
  const shared = Array.from(wa).filter((w) => wb.has(w)).length;
  return shared / Math.min(wa.size, wb.size) >= 0.5;
}

async function main(): Promise<void> {
  const supabase = createAdminClient();

  console.log("Fetching amenity=toilets in Metro Manila from Overpass...");
  const osm = await fetchOsmRestrooms(USER_AGENT);
  console.log(`  ${osm.length} usable restrooms from OSM (after removing invalid, private and duplicate elements)`);

  const { data: existing, error: readError } = await supabase
    .from("restrooms")
    .select("id, name, latitude, longitude, source, osm_type, osm_id");
  if (readError) throw new Error(`Could not read restrooms (did you run 0006_osm.sql?): ${readError.message}`);

  const imported = new Set(existing.filter((r) => r.osm_id).map((r) => `${r.osm_type}/${r.osm_id}`));
  const others = existing.filter((r) => r.source !== "osm");

  const skippedImported: OsmRestroom[] = [];
  const skippedNearby: { osm: OsmRestroom; existing: string; meters: number }[] = [];
  const toImport: OsmRestroom[] = [];
  for (const restroom of osm) {
    if (imported.has(`${restroom.osmType}/${restroom.osmId}`)) {
      skippedImported.push(restroom);
      continue;
    }
    const near = others
      .map((r) => ({ r, meters: distanceMeters(r.latitude, r.longitude, restroom.latitude, restroom.longitude) }))
      .filter(({ meters }) => meters <= DUPLICATE_RADIUS_M)
      .find(({ r }) => !restroom.named || similarNames(r.name, restroom.name));
    if (near) {
      skippedNearby.push({ osm: restroom, existing: near.r.name, meters: Math.round(near.meters) });
      continue;
    }
    toImport.push(restroom);
  }

  console.log(`  already imported: ${skippedImported.length}`);
  console.log(`  near an existing restroom (kept the existing one): ${skippedNearby.length}`);
  skippedNearby.forEach(({ osm: o, existing: e, meters }) => console.log(`    - "${o.name}" ~ "${e}" (${meters} m)`));
  console.log(`  to import: ${toImport.length} (${toImport.filter((r) => !r.address).length} without an address)`);

  // ---- fill missing addresses (Nominatim, 1 request/second) ----
  const addresses = new Map<OsmRestroom, string>();
  const missing = toImport.filter((r) => !r.address);
  if (GEOCODE && !DRY_RUN && missing.length > 0) {
    console.log(`Looking up ${missing.length} addresses with Nominatim (~${Math.ceil((missing.length * GEOCODE_DELAY_MS) / 60000)} min)...`);
    for (let i = 0; i < missing.length; i++) {
      const restroom = missing[i];
      const address = await reverseGeocode(restroom.latitude, restroom.longitude, undefined, USER_AGENT);
      if (address && address.trim().length >= 5) addresses.set(restroom, address.slice(0, 200));
      if ((i + 1) % 25 === 0) console.log(`  ${i + 1}/${missing.length}`);
      await sleep(GEOCODE_DELAY_MS);
    }
  }

  const rows: RestroomInsert[] = toImport.map((r) => ({
    name: r.name,
    description: r.description,
    address: r.address ?? addresses.get(r) ?? "Metro Manila",
    latitude: r.latitude,
    longitude: r.longitude,
    amenities: r.amenities,
    is_free: r.isFree,
    images: [],
    created_by: null,
    status: "approved",
    ai_checked_at: new Date().toISOString(),
    source: "osm",
    osm_type: r.osmType,
    osm_id: r.osmId,
  }));

  if (DRY_RUN) {
    console.log("\nDry run: nothing written. Sample:");
    rows.slice(0, 8).forEach((row) => console.log(`  ${row.name} | ${row.address} | ${row.amenities?.join(",")} | free=${row.is_free}`));
    return;
  }

  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    // ignoreDuplicates: a row that appeared since we read the table is skipped, not an error
    const { data, error } = await supabase
      .from("restrooms")
      .upsert(batch, { onConflict: "osm_type,osm_id", ignoreDuplicates: true })
      .select("id");
    if (error) throw new Error(`Insert failed at batch ${i / BATCH_SIZE + 1}: ${error.message}`);
    inserted += data.length;
  }
  console.log(`Inserted ${inserted} restroom(s) from OpenStreetMap.`);

  // Equivalent of: SELECT COUNT(*) FROM restrooms WHERE source = 'osm';
  const { count, error: countError } = await supabase
    .from("restrooms")
    .select("id", { count: "exact", head: true })
    .eq("source", "osm");
  if (countError) throw new Error(`Count failed: ${countError.message}`);
  console.log(`SELECT COUNT(*) FROM restrooms WHERE source = 'osm'; → ${count}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
