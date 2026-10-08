/**
 * Imports public restrooms (amenity=toilets) from OpenStreetMap into
 * Supabase, for the cities in lib/cities.ts (Metro Manila, Cebu, Davao,
 * Iloilo, Bacolod).
 *
 *   npx tsx scripts/import-osm.ts                       # every city
 *   npx tsx scripts/import-osm.ts --city=cebu,davao     # only these (slugs from lib/cities.ts)
 *   npx tsx scripts/import-osm.ts --dry-run             # fetch + show what would happen, no writes
 *   npx tsx scripts/import-osm.ts --no-geocode          # skip filling missing addresses
 *
 * Toilets without a name in OSM get a descriptive one (lib/osm-naming.ts),
 * e.g. "CR sa Ayala Center Cebu", instead of "Public CR".
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
import { CITIES, type City } from "@/lib/cities";
import { reverseGeocode } from "@/lib/geocode";
import { distanceMeters, fetchOsmLandmarks, fetchOsmRestrooms, normalizeName, type OsmLandmark, type OsmRestroom } from "@/lib/osm";
import { describeRestroom, pickLandmark, uniqueName } from "@/lib/osm-naming";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RestroomInsert } from "@/types/database";

// Node 20.12+: load .env.local since this runs outside Next.js
process.loadEnvFile(".env.local");

const DRY_RUN = process.argv.includes("--dry-run");
const CITY_ARG = process.argv.find((arg) => arg.startsWith("--city="))?.slice("--city=".length);
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

/** An OSM restroom plus the city it was fetched for. */
type CityRestroom = OsmRestroom & { city: City };

function selectedCities(): City[] {
  if (!CITY_ARG) return [...CITIES];
  const slugs = CITY_ARG.split(",").map((slug) => slug.trim());
  const unknown = slugs.filter((slug) => !CITIES.some((city) => city.slug === slug));
  if (unknown.length > 0) {
    throw new Error(`Unknown city: ${unknown.join(", ")}. Use: ${CITIES.map((city) => city.slug).join(", ")}`);
  }
  return CITIES.filter((city) => slugs.includes(city.slug));
}

async function main(): Promise<void> {
  const supabase = createAdminClient();
  const cities = selectedCities();

  const osm: CityRestroom[] = [];
  for (const city of cities) {
    console.log(`Fetching amenity=toilets in ${city.name} from Overpass...`);
    const found = await fetchOsmRestrooms(city, USER_AGENT);
    console.log(`  ${found.length} usable restrooms (after removing invalid, private and duplicate elements)`);
    osm.push(...found.map((restroom) => ({ ...restroom, city })));
  }

  const { data: existing, error: readError } = await supabase
    .from("restrooms")
    .select("id, name, latitude, longitude, source, osm_type, osm_id");
  if (readError) throw new Error(`Could not read restrooms (did you run 0006_osm.sql?): ${readError.message}`);

  const imported = new Set(existing.filter((r) => r.osm_id).map((r) => `${r.osm_type}/${r.osm_id}`));
  const others = existing.filter((r) => r.source !== "osm");

  const skippedImported: CityRestroom[] = [];
  const skippedNearby: { osm: CityRestroom; existing: string; meters: number }[] = [];
  const toImport: CityRestroom[] = [];
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

  // ---- landmarks for naming toilets without one (before geocoding, so an
  //      Overpass failure stops the run before minutes of Nominatim lookups) ----
  const unnamed = toImport.filter((r) => !r.named);
  const landmarks: OsmLandmark[] = [];
  for (const city of cities) {
    if (!unnamed.some((r) => r.city === city)) continue;
    console.log(`Fetching landmarks near toilets in ${city.name} (to name ${unnamed.filter((r) => r.city === city).length} unnamed)...`);
    landmarks.push(...(await fetchOsmLandmarks(city, USER_AGENT)));
  }

  // ---- fill missing addresses (Nominatim, 1 request/second) ----
  const addresses = new Map<CityRestroom, string>();
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

  // ---- names: nearby landmark, else the address ----
  const taken = new Set(existing.map((r) => r.name.toLowerCase()));
  const addressOf = (r: CityRestroom) => r.address ?? addresses.get(r) ?? r.city.fallbackAddress;
  const nameOf = new Map<CityRestroom, string>();
  for (const r of toImport) {
    const name = r.named
      ? r.name
      : uniqueName(describeRestroom(addressOf(r), pickLandmark(r.latitude, r.longitude, landmarks)), addressOf(r), taken);
    nameOf.set(r, name);
  }

  const rows: RestroomInsert[] = toImport.map((r) => ({
    name: nameOf.get(r) ?? r.name,
    description: r.description,
    address: addressOf(r),
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
    console.log("\nDry run: nothing written. Sample per city:");
    for (const city of cities) {
      const cityRows = rows.filter((_, i) => toImport[i].city === city);
      console.log(`  ${city.name}: ${cityRows.length} to import`);
      cityRows.slice(0, 6).forEach((row) => console.log(`    ${row.name} | ${row.address} | free=${row.is_free}`));
    }
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
