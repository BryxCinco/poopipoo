/**
 * Gives the OpenStreetMap restrooms that were imported without a name
 * ("Public CR") or with a generic one ("Toilet", "men/women") a descriptive one, e.g. "CR sa Rizal Park" or
 * "CR sa Taft Avenue, Malate". See lib/osm-naming.ts for the rules.
 *
 *   npx tsx scripts/rename-osm-restrooms.ts            # rename
 *   npx tsx scripts/rename-osm-restrooms.ts --dry-run  # show the new names, no writes
 *
 * Restrooms whose address is only a city ("Manila") get a fresh address from
 * Nominatim first (1 request/second), which also gives a better name.
 * Only touches source = 'osm' rows with such a name, so it's safe to re-run. Renaming clears the embedding (DB trigger); run
 * scripts/generate-embeddings.ts --missing afterwards.
 */
import { CITIES, isInBounds } from "@/lib/cities";
import { reverseGeocode } from "@/lib/geocode";
import { fetchOsmLandmarks, type OsmLandmark } from "@/lib/osm";
import { describeRestroom, needsDescriptiveName, pickLandmark, uniqueName } from "@/lib/osm-naming";
import { createAdminClient } from "@/lib/supabase/admin";

// Node 20.12+: load .env.local since this runs outside Next.js
process.loadEnvFile(".env.local");

const DRY_RUN = process.argv.includes("--dry-run");
const USER_AGENT = "Poopipoo/1.0 (restroom finder; +https://poopipoo.vercel.app)";
// Nominatim usage policy: at most 1 request per second
const GEOCODE_DELAY_MS = 1100;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main(): Promise<void> {
  const supabase = createAdminClient();
  const { data: restrooms, error } = await supabase
    .from("restrooms")
    .select("id, name, address, latitude, longitude, source")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Could not read restrooms: ${error.message}`);

  const targets = restrooms.filter((r) => r.source === "osm" && needsDescriptiveName(r.name));
  console.log(`${targets.length} unnamed or generically named OSM restroom(s) to rename.`);
  if (targets.length === 0) return;

  // Landmarks, one Overpass query per city that has targets
  const landmarks: OsmLandmark[] = [];
  for (const city of CITIES) {
    if (!targets.some((r) => isInBounds(r.latitude, r.longitude, city.bounds))) continue;
    console.log(`Fetching landmarks near toilets in ${city.name}...`);
    const found = await fetchOsmLandmarks(city, USER_AGENT);
    console.log(`  ${found.length} landmark(s)`);
    landmarks.push(...found);
  }

  // Every name already in use (other restrooms keep theirs)
  const taken = new Set(restrooms.filter((r) => !targets.includes(r)).map((r) => r.name.toLowerCase()));

  let geocoded = 0;
  const updates: { id: string; name: string; address: string; oldName: string }[] = [];
  for (const restroom of targets) {
    let address = restroom.address;
    // Only a city (or nothing) to go on: look the address up
    if (address.split(",").filter((part) => part.trim()).length <= 1) {
      const found = await reverseGeocode(restroom.latitude, restroom.longitude, undefined, USER_AGENT);
      if (found && found.trim().length >= 5) {
        address = found.slice(0, 200);
        geocoded++;
      }
      await sleep(GEOCODE_DELAY_MS);
    }
    const landmark = pickLandmark(restroom.latitude, restroom.longitude, landmarks);
    const name = uniqueName(describeRestroom(address, landmark), address, taken);
    updates.push({ id: restroom.id, name, address, oldName: restroom.name });
  }

  const byLandmark = updates.filter((u) => !u.name.includes(",")).length;
  console.log(`Names ready (${geocoded} address(es) looked up). Sample:`);
  updates.filter((_, i) => i % Math.max(1, Math.floor(updates.length / 25)) === 0).forEach((u) => console.log(`  ${u.name}  |  ${u.address}`));
  console.log(`  ~${byLandmark} named after a landmark or place, ${updates.length - byLandmark} after the street/area.`);

  if (DRY_RUN) {
    console.log("\nDry run: nothing written.");
    return;
  }

  let done = 0;
  for (const update of updates) {
    const { error: updateError } = await supabase
      .from("restrooms")
      .update({ name: update.name, address: update.address })
      .eq("id", update.id)
      .eq("name", update.oldName); // never overwrite a name someone set meanwhile
    if (updateError) throw new Error(`Update failed for ${update.id}: ${updateError.message}`);
    done++;
    if (done % 100 === 0) console.log(`  ${done}/${updates.length}`);
  }

  const { data: left } = await supabase.from("restrooms").select("name").eq("source", "osm");
  const generic = (left ?? []).filter((r) => needsDescriptiveName(r.name)).length;
  console.log(`Renamed ${done} restroom(s). OSM restrooms still with a generic name: ${generic}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
