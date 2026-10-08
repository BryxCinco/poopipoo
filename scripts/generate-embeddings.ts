/**
 * Generates embeddings for restrooms (all-MiniLM-L6-v2, 384 dims) and saves
 * them in restrooms.embedding for the AI agent's vector search.
 *
 *   npx tsx scripts/generate-embeddings.ts             # all restrooms
 *   npx tsx scripts/generate-embeddings.ts --missing   # only ones without an embedding
 *   npx tsx scripts/generate-embeddings.ts --api       # use the Hugging Face API (needs credits)
 *
 * By default the model runs locally (transformers.js, lib/ai/local-embeddings.ts):
 * free, no API key, and the same vectors as the API. The first run downloads
 * the model (~23 MB). Needs migration 0003_embeddings.sql and
 * SUPABASE_SECRET_KEY in .env.local. Safe to re-run.
 */
import { generateEmbedding, toPgVector } from "@/lib/ai/embeddings";
import { generateLocalEmbeddings } from "@/lib/ai/local-embeddings";
import { restroomToDocument } from "@/lib/ai/restroom-document";
import { createAdminClient } from "@/lib/supabase/admin";

// Node 20.12+: load .env.local since this runs outside Next.js
process.loadEnvFile(".env.local");

const USE_API = process.argv.includes("--api");
// Local: texts per model call. API: one request each, spaced out for the free tier.
const BATCH_SIZE = 32;
const API_DELAY_MS = 300;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main(): Promise<void> {
  const onlyMissing = process.argv.includes("--missing");
  const supabase = createAdminClient();

  // Supabase returns at most 1000 rows per request: read in pages
  type Row = { id: string; name: string; description: string; address: string; amenities: string[]; is_free: boolean };
  const restrooms: Row[] = [];
  for (let from = 0; ; from += 1000) {
    let query = supabase
      .from("restrooms")
      .select("id, name, description, address, amenities, is_free")
      .order("created_at", { ascending: true })
      .range(from, from + 999);
    if (onlyMissing) query = query.is("embedding", null);
    const { data, error } = await query;
    if (error) throw new Error(`Could not read restrooms: ${error.message}`);
    restrooms.push(...data);
    if (data.length < 1000) break;
  }
  console.log(`${restrooms.length} restroom(s) to embed${onlyMissing ? " (missing only)" : ""}, ${USE_API ? "Hugging Face API" : "local model"}.`);

  let done = 0;
  let failed = 0;
  for (let i = 0; i < restrooms.length; i += BATCH_SIZE) {
    const batch = restrooms.slice(i, i + BATCH_SIZE);
    let vectors: number[][];
    try {
      vectors = USE_API
        ? await sequential(batch.map(restroomToDocument))
        : await generateLocalEmbeddings(batch.map(restroomToDocument));
    } catch (err) {
      failed += batch.length;
      console.error(`  FAILED batch at ${i}: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }
    for (let j = 0; j < batch.length; j++) {
      const { error: updateError } = await supabase
        .from("restrooms")
        .update({ embedding: toPgVector(vectors[j]) })
        .eq("id", batch[j].id);
      if (updateError) {
        failed++;
        console.error(`  FAILED ${batch[j].name}: ${updateError.message}`);
      } else {
        done++;
      }
    }
    console.log(`  ${done + failed}/${restrooms.length}`);
  }

  // Same check as: SELECT COUNT(*) FROM restrooms WHERE embedding IS NOT NULL;
  const [{ count: withEmbedding }, { count: total }] = await Promise.all([
    supabase.from("restrooms").select("id", { count: "exact", head: true }).not("embedding", "is", null),
    supabase.from("restrooms").select("id", { count: "exact", head: true }),
  ]);
  console.log(`Done: ${done} embedded, ${failed} failed. ${withEmbedding ?? "?"}/${total ?? "?"} restrooms have an embedding.`);
  if (failed > 0) process.exitCode = 1;
}

/** API mode: one request at a time (generateEmbedding falls back to local if the API fails). */
async function sequential(texts: string[]): Promise<number[][]> {
  const vectors: number[][] = [];
  for (const text of texts) {
    vectors.push(await generateEmbedding(text));
    await sleep(API_DELAY_MS);
  }
  return vectors;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
