/**
 * Text embeddings via the Hugging Face Inference API (free tier).
 *
 * Model: sentence-transformers/all-MiniLM-L6-v2 — 384 dimensions, English.
 * Server-only (uses HUGGINGFACE_API_KEY). Also used by
 * scripts/generate-embeddings.ts, which runs outside Next.js.
 *
 * Endpoint note: the old api-inference.huggingface.co host no longer exists
 * (DNS fails); the same serverless inference now lives on router.huggingface.co.
 * The token needs the "Make calls to Inference Providers" permission.
 */

export const EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2";
export const EMBEDDING_DIMENSIONS = 384;

const ENDPOINT = `https://router.huggingface.co/hf-inference/models/${EMBEDDING_MODEL}/pipeline/feature-extraction`;
const TIMEOUT_MS = 20_000;
// Retries for "model is loading" (503) and rate limits (429)
const MAX_ATTEMPTS = 3;
const MAX_RETRY_WAIT_MS = 10_000;
// The model only reads ~256 tokens anyway; keeps requests small
const MAX_INPUT_CHARS = 1_000;

export type EmbeddingErrorKind = "config" | "auth" | "rate-limit" | "unavailable" | "network" | "invalid-response";

export class EmbeddingError extends Error {
  constructor(
    public readonly kind: EmbeddingErrorKind,
    message: string
  ) {
    super(message);
    this.name = "EmbeddingError";
  }
}

// ---------- in-memory cache ----------

// Same text → same vector, so repeated questions don't hit the API again.
// Insertion-ordered Map used as a small LRU.
const CACHE_MAX = 300;
const cache = new Map<string, number[]>();

const cacheKey = (text: string) => text.trim().replace(/\s+/g, " ").toLowerCase();

function remember(key: string, vector: number[]): void {
  cache.delete(key);
  cache.set(key, vector);
  if (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
}

// ---------- response parsing ----------

const isNumberArray = (value: unknown): value is number[] =>
  Array.isArray(value) && value.length > 0 && value.every((n) => typeof n === "number" && Number.isFinite(n));

/**
 * sentence-transformers models return one pooled vector ([384]); some setups
 * return per-token vectors ([tokens][384]) or a batch wrapper ([1][384]).
 * Mean-pool token vectors so we always end up with a single vector.
 */
function toSentenceVector(data: unknown): number[] | null {
  if (isNumberArray(data)) return data;
  if (!Array.isArray(data) || data.length === 0) return null;
  if (data.length === 1) return toSentenceVector(data[0]);
  if (!data.every(isNumberArray)) return null;

  const rows = data as number[][];
  const sums = new Array<number>(rows[0].length).fill(0);
  for (const row of rows) row.forEach((value, i) => (sums[i] += value));
  return sums.map((sum) => sum / rows.length);
}

/** Unit length, so cosine similarity is consistent regardless of the source. */
function normalize(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  return norm > 0 ? vector.map((v) => v / norm) : vector;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function retryDelay(response: Response, attempt: number): number {
  const header = Number(response.headers.get("retry-after"));
  const ms = Number.isFinite(header) && header > 0 ? header * 1000 : 1000 * 2 ** attempt;
  return Math.min(ms, MAX_RETRY_WAIT_MS);
}

// ---------- API ----------

/** Embeds `text` into a 384-dimension unit vector. Throws EmbeddingError. */
export async function generateEmbedding(text: string): Promise<number[]> {
  const input = text.trim().slice(0, MAX_INPUT_CHARS);
  if (!input) throw new EmbeddingError("invalid-response", "Walang text na ie-embed.");

  const key = cacheKey(input);
  const cached = cache.get(key);
  if (cached) {
    remember(key, cached); // mark as recently used
    return cached;
  }

  const token = process.env.HUGGINGFACE_API_KEY;
  if (!token) throw new EmbeddingError("config", "Missing environment variable HUGGINGFACE_API_KEY.");

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let response: Response;
    try {
      response = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          // Wait for a cold model to load instead of failing with 503
          "x-wait-for-model": "true",
        },
        body: JSON.stringify({ inputs: input }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      });
    } catch {
      if (attempt < MAX_ATTEMPTS - 1) {
        await sleep(1000 * 2 ** attempt);
        continue;
      }
      throw new EmbeddingError("network", "Hindi maabot ang Hugging Face. Subukan ulit.");
    }

    if (response.ok) {
      const vector = toSentenceVector(await response.json().catch(() => null));
      if (!vector || vector.length !== EMBEDDING_DIMENSIONS) {
        throw new EmbeddingError("invalid-response", "Hindi inaasahang sagot mula sa Hugging Face.");
      }
      const normalized = normalize(vector);
      remember(key, normalized);
      return normalized;
    }

    if (response.status === 401 || response.status === 403) {
      throw new EmbeddingError(
        "auth",
        "Hindi tinanggap ng Hugging Face ang API key (kailangan ang 'Inference Providers' permission)."
      );
    }
    const retryable = response.status === 429 || response.status === 503 || response.status >= 500;
    if (retryable && attempt < MAX_ATTEMPTS - 1) {
      await sleep(retryDelay(response, attempt));
      continue;
    }
    if (response.status === 429) {
      throw new EmbeddingError("rate-limit", "Naabot ang limit ng Hugging Face. Subukan ulit mamaya.");
    }
    throw new EmbeddingError("unavailable", `Hindi available ang Hugging Face ngayon (HTTP ${response.status}).`);
  }

  // Unreachable (the loop always returns or throws), but keeps TypeScript happy
  throw new EmbeddingError("unavailable", "Hindi available ang Hugging Face ngayon.");
}

/** pgvector's text format ("[0.1,0.2,...]"), for writing the embedding column. */
export const toPgVector = (vector: number[]): string => `[${vector.join(",")}]`;
