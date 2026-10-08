import type { FeatureExtractionPipeline } from "@huggingface/transformers";

/**
 * Local embeddings with transformers.js (ONNX Runtime), no API and no credits.
 *
 * Same model as the Hugging Face API in lib/ai/embeddings.ts
 * (all-MiniLM-L6-v2, 384 dimensions, mean pooling, unit length), so vectors
 * from either source can be compared with each other. The 8-bit quantized
 * ONNX weights (~23 MB) are downloaded from the Hugging Face Hub once (a
 * free file download, not the paid Inference API) and cached on disk.
 *
 * Server only. The library is imported lazily, so it's only loaded when the
 * API isn't available.
 */

export const LOCAL_EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";

// One model instance per server process (loading takes a few seconds)
let extractor: Promise<FeatureExtractionPipeline> | null = null;

function loadExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractor) {
    extractor = (async () => {
      const { pipeline, env } = await import("@huggingface/transformers");
      // Serverless functions can only write to /tmp
      if (process.env.VERCEL) env.cacheDir = "/tmp/transformers-cache";
      return pipeline("feature-extraction", LOCAL_EMBEDDING_MODEL, { dtype: "q8" });
    })();
    // A failed load (e.g. no network for the first download) can be retried later
    extractor.catch(() => {
      extractor = null;
    });
  }
  return extractor;
}

/** Embeds several texts at once; each result is a 384-number unit vector. */
export async function generateLocalEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const extract = await loadExtractor();
  const output = await extract(texts, { pooling: "mean", normalize: true });
  return output.tolist() as number[][];
}
