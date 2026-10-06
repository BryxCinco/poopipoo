/**
 * Generates embeddings for restrooms (Hugging Face all-MiniLM-L6-v2, 384 dims)
 * and saves them in restrooms.embedding for the AI agent's vector search.
 *
 *   npx tsx scripts/generate-embeddings.ts             # all restrooms
 *   npx tsx scripts/generate-embeddings.ts --missing   # only ones without an embedding
 *
 * Needs migration 0003_embeddings.sql, plus HUGGINGFACE_API_KEY and
 * SUPABASE_SECRET_KEY in .env.local. Safe to re-run.
 */
import { generateEmbedding, toPgVector } from "@/lib/ai/embeddings";
import { restroomToDocument } from "@/lib/ai/restroom-document";
import { createAdminClient } from "@/lib/supabase/admin";

// Node 20.12+: load .env.local since this runs outside Next.js
process.loadEnvFile(".env.local");

// Stay well under the free tier's request rate
const DELAY_MS = 300;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main(): Promise<void> {
  const onlyMissing = process.argv.includes("--missing");
  const supabase = createAdminClient();

  let query = supabase
    .from("restrooms")
    .select("id, name, description, address, amenities, is_free")
    .order("created_at", { ascending: true });
  if (onlyMissing) query = query.is("embedding", null);

  const { data: restrooms, error } = await query;
  if (error) throw new Error(`Could not read restrooms: ${error.message}`);
  console.log(`${restrooms.length} restroom(s) to embed${onlyMissing ? " (missing only)" : ""}.`);

  let done = 0;
  let failed = 0;
  for (const restroom of restrooms) {
    try {
      const vector = await generateEmbedding(restroomToDocument(restroom));
      const { error: updateError } = await supabase
        .from("restrooms")
        .update({ embedding: toPgVector(vector) })
        .eq("id", restroom.id);
      if (updateError) throw new Error(updateError.message);
      done++;
      console.log(`  [${done + failed}/${restrooms.length}] ${restroom.name}`);
    } catch (err) {
      failed++;
      console.error(`  FAILED ${restroom.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
    await sleep(DELAY_MS);
  }

  // Same check as: SELECT COUNT(*) FROM restrooms WHERE embedding IS NOT NULL;
  const [{ count: withEmbedding }, { count: total }] = await Promise.all([
    supabase.from("restrooms").select("id", { count: "exact", head: true }).not("embedding", "is", null),
    supabase.from("restrooms").select("id", { count: "exact", head: true }),
  ]);
  console.log(`Done: ${done} embedded, ${failed} failed. ${withEmbedding ?? "?"}/${total ?? "?"} restrooms have an embedding.`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
