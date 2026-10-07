import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { EmbeddingError } from "@/lib/ai/embeddings";
import { buildContext, searchRestrooms } from "@/lib/ai/rag";
import { calculateDistance, formatDistance } from "@/lib/distance";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { ALL_AMENITIES } from "@/lib/icons";
import { isUuid, RESTROOM_COLUMNS, rowToRestroom } from "@/lib/restrooms/mappers";
import type { AgentAction, AgentResponse, ChatMessage, RankedRestroom } from "@/types/agent";
import type { Database } from "@/types/database";
import type { LatLng } from "@/types/geo";
import type { Amenity } from "@/types/restroom";

/**
 * Poopipoo Assistant: an LLM (Groq, OpenAI-compatible API) that answers with
 * tool calling over our own data. Server-only (uses GROQ_API_KEY).
 *
 * Loop: send the conversation + tools → if the model asks for tools, run
 * them and send the results back → repeat until it answers in plain text
 * (max MAX_STEPS rounds).
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
// llama-3.3-70b-versatile is no longer offered on Groq. gpt-oss-120b is an
// open-weight model hosted by Groq (free tier) with reliable tool calling.
const MODEL = "openai/gpt-oss-120b";
const MAX_STEPS = 4;
const TIMEOUT_MS = 30_000;
// Keep prompts small: the free tier allows ~8k tokens per minute
const MAX_HISTORY_MESSAGES = 6;
const MAX_HISTORY_CHARS = 600;
const MAX_RESTROOM_CARDS = 3;

// ---------- errors ----------

export type AgentErrorKind = "config" | "rate-limit" | "upstream" | "timeout";

export class AgentError extends Error {
  constructor(
    public readonly kind: AgentErrorKind,
    message: string
  ) {
    super(message);
    this.name = "AgentError";
  }
}

interface AgentInput {
  message: string;
  history?: ChatMessage[];
  /** The user's location (from the browser), if they allowed it */
  location?: LatLng | null;
  /** Signed-in user's Supabase client (RLS applies) */
  client: SupabaseClient<Database>;
  /** The app language: the assistant answers in it */
  locale: Locale;
}

// ---------- Groq wire format ----------

interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

type GroqMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

const completionSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().nullable().optional(),
          tool_calls: z
            .array(
              z.object({
                id: z.string(),
                type: z.literal("function"),
                function: z.object({ name: z.string(), arguments: z.string() }),
              })
            )
            .optional(),
        }),
      })
    )
    .min(1),
});

// ---------- tools ----------

const AMENITY_VALUES = ALL_AMENITIES.filter((amenity) => amenity !== "free");

const TOOLS = [
  {
    type: "function",
    function: {
      name: "search_restrooms",
      description:
        "Hanapin ang mga CR sa database ng Poopipoo. Gamitin ito sa LAHAT ng tanong tungkol sa CR. " +
        "Isulat ang query sa English at buuin ang pangalan ng lugar (hal. 'restroom with bidet in Bonifacio Global City Taguig'). " +
        "Gamitin ang sort_by 'distance' LANG kapag 'pinakamalapit' o 'malapit sa akin' ang tanong at walang binanggit na lugar. " +
        "Kapag may binanggit na lugar (hal. Ortigas, BGC), 'relevance' ang gamitin.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query in English, with full place names" },
          filters: {
            type: "object",
            properties: {
              is_free: { type: "boolean", description: "true = libre lang, false = may bayad lang" },
              amenities: {
                type: "array",
                items: { type: "string", enum: AMENITY_VALUES },
                description: "Mga kailangang amenities",
              },
            },
          },
          sort_by: { type: "string", enum: ["relevance", "distance"] },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_distance",
      description: "Kalkulahin ang layo ng isang CR mula sa user.",
      parameters: {
        type: "object",
        properties: {
          restroom_id: { type: "string" },
          user_lat: { type: "number" },
          user_lng: { type: "number" },
        },
        required: ["restroom_id", "user_lat", "user_lng"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "start_navigation",
      description:
        "Ipakita sa user ang button para simulan ang navigation papunta sa isang CR. " +
        "Gamitin kapag gusto ng user na pumunta, magpa-direksyon, o 'dalhin mo ako'.",
      parameters: {
        type: "object",
        properties: { restroom_id: { type: "string" } },
        required: ["restroom_id"],
      },
    },
  },
] as const;

const searchArgs = z.object({
  query: z.string().trim().min(1).max(300),
  filters: z
    .object({
      is_free: z.boolean().optional(),
      amenities: z.array(z.string()).optional(),
    })
    .nullish(),
  sort_by: z.enum(["relevance", "distance"]).nullish(),
});

const distanceArgs = z.object({
  restroom_id: z.string(),
  // Roughly the Philippines' bounding box
  user_lat: z.number().min(4).max(22),
  user_lng: z.number().min(116).max(127),
});

const navigationArgs = z.object({ restroom_id: z.string() });

// The model only sees ids in tool results (not in chat history), so for follow-ups
// like "dalhin mo ako doon" it may guess one. Tell it how to recover.
const UNKNOWN_ID =
  "Error: walang CR na may ganitong id. Gamitin muna ang search_restrooms para makuha ang tamang id, tapos tawagin ulit ang tool na ito.";

const isAmenity = (value: string): value is Amenity => (AMENITY_VALUES as string[]).includes(value);

/** What the tools found during one agent run, returned to the client. */
interface RunState {
  found: Map<string, RankedRestroom>;
  action: AgentAction | null;
}

async function getRestroom(client: SupabaseClient<Database>, id: string) {
  if (!isUuid(id)) return null;
  const { data } = await client.from("restrooms").select(RESTROOM_COLUMNS).eq("id", id).maybeSingle();
  return data ? rowToRestroom(data) : null;
}

/** Runs one tool call and returns its result as text for the model. */
async function runTool(call: ToolCall, input: AgentInput, run: RunState): Promise<string> {
  let args: unknown;
  try {
    args = JSON.parse(call.function.arguments || "{}");
  } catch {
    return "Error: hindi valid na JSON ang arguments.";
  }

  switch (call.function.name) {
    case "search_restrooms": {
      const parsed = searchArgs.safeParse(args);
      if (!parsed.success) return "Error: kailangan ang 'query' (string).";
      const { query, filters, sort_by } = parsed.data;
      const wantsDistance = sort_by === "distance";
      if (wantsDistance && !input.location) {
        return "Hindi alam ang lokasyon ng user. Sabihin sa user na i-allow ang location para makita ang pinakamalapit.";
      }

      const results = await searchRestrooms(query, {
        client: input.client,
        location: input.location,
        sortBy: wantsDistance ? "distance" : "relevance",
        filters: filters
          ? { isFree: filters.is_free, amenities: filters.amenities?.filter(isAmenity) }
          : undefined,
      });
      results.forEach((restroom) => run.found.set(restroom.id, restroom));
      return buildContext(results, input.locale);
    }

    case "get_distance": {
      const parsed = distanceArgs.safeParse(args);
      if (!parsed.success) return "Error: kailangan ang restroom_id at tamang user_lat/user_lng sa Pilipinas.";
      const restroom = await getRestroom(input.client, parsed.data.restroom_id);
      if (!restroom) return UNKNOWN_ID;

      const km = calculateDistance(parsed.data.user_lat, parsed.data.user_lng, restroom.latitude, restroom.longitude);
      // Streets aren't straight: ~1.3x detour at 5 km/h walking
      const walkMinutes = Math.max(1, Math.round(((km * 1.3) / 5) * 60));
      run.found.set(restroom.id, { ...restroom, similarity: null, distanceKm: km });
      return `${restroom.name}: ${formatDistance(km)} (tuwid na linya), mga ${walkMinutes} minutong lakad (tantya).`;
    }

    case "start_navigation": {
      const parsed = navigationArgs.safeParse(args);
      if (!parsed.success) return "Error: kailangan ang restroom_id.";
      const restroom = await getRestroom(input.client, parsed.data.restroom_id);
      if (!restroom) return UNKNOWN_ID;

      run.action = { type: "navigate", restroom_id: restroom.id };
      const known = run.found.get(restroom.id);
      run.found.set(restroom.id, known ?? { ...restroom, similarity: null, distanceKm: null });
      return `OK. Makikita ng user ang "${getDictionary(input.locale).agent.startNavigation}" button para sa ${restroom.name}. Sabihin sa kanya na pindutin ito.`;
    }

    default:
      return `Error: walang tool na "${call.function.name}".`;
  }
}

// ---------- prompt ----------

function systemPrompt(location: LatLng | null | undefined, locale: Locale): string {
  const button = getDictionary(locale).agent.startNavigation;
  // The rules stay in Filipino (the model follows them fine); only the answer language changes
  const language =
    locale === "en"
      ? "Answer in English (the user chose English), kahit Filipino ang mga patakaran sa ibaba at ang tanong."
      : "Sagutin mo sa Filipino.";
  const where = location
    ? `Lokasyon ng user: lat ${location.latitude.toFixed(5)}, lng ${location.longitude.toFixed(5)}.`
    : "Hindi alam ang lokasyon ng user (hindi pinayagan o hindi available).";

  return [
    "Ikaw si Poopipoo Assistant. Tumutulong ka sa users na maghanap ng CR sa Pilipinas. " +
      `${language} Maging concise at helpful. Kung may tool na kailangan, gamitin ito.`,
    where,
    "Mga patakaran:",
    "- Sa anumang tanong tungkol sa CR, gamitin muna ang search_restrooms. Ang sagot mo ay dapat galing LANG sa resulta ng tools. Huwag mag-imbento ng CR, lugar, address, presyo, o amenities.",
    "- Kung walang nahanap, sabihin nang tapat at imungkahi na i-add ng user ang CR na alam niya.",
    "- Kung tinanong ang layo at alam ang lokasyon, gamitin ang get_distance gamit ang lokasyon sa itaas.",
    `- Kung gustong pumunta o magpa-direksyon ng user, gamitin ang start_navigation. Banggitin lang ang '${button}' button kung tinawag mo ang start_navigation sa sagot na ito.`,
    "- Kung nag-error ang tool, sabihin na may problema sa paghahanap ngayon. Huwag sabihing walang CR.",
    "- Ipapakita ng app ang mga CR bilang cards na may address, rating, presyo at layo. Kaya sa sagot, pangalan lang ng CR at ang pinaka-kaugnay na detalye sa tanong (hal. may bidet, libre). Huwag ulitin ang buong address.",
    "- Maikli lang: 1 hanggang 3 pangungusap, hanggang 3 CR. Plain text lang: walang markdown, walang **, #, o table. Huwag ipakita ang id.",
    "- Ang tanong tungkol sa isang lugar, mall, o layo (hal. 'Gaano kalayo ang Greenbelt 5?') ay tungkol sa CR doon: hanapin ito.",
    "- Para sa 'dalhin mo ako doon' at iba pang follow-up, gamitin ang id mula sa '[Mga CR sa sagot na ito: ...]' sa naunang sagot.",
    "- Kung hindi talaga tungkol sa CR ang tanong (hal. panahon, balita), magalang na sabihin na CR lang ang matutulungan mo.",
  ].join("\n");
}

/**
 * Models sometimes ignore "no markdown"; the chat UI shows plain text.
 * Also maps the model's typographic spaces/hyphens (U+00A0, U+202F, U+2011…)
 * to plain ones, so restroom names in the answer match the database names.
 */
function toPlainText(text: string): string {
  return text
    .replace(/[\u00A0\u2007\u202F]/g, " ")
    .replace(/[\u2010\u2011]/g, "-")
    // The model may copy the id note we add to history; it's not for the user
    .replace(/\[Mga CR sa sagot na ito:[^\]]*\]/gi, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[*-]\s+/gm, "- ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// The navigation button's label in either language
const NAVIGATION_HINT = /simulan ang navigation|start navigation/i;

/** Removes sentences that mention the "Simulan ang navigation" / "Start navigation" button. */
function withoutNavigationHint(text: string): string {
  if (!NAVIGATION_HINT.test(text)) return text;
  return text
    .split("\n")
    .map((line) =>
      // Sentences end at . ! ? (keep the punctuation with the sentence)
      (line.match(/[^.!?]+[.!?]*/g) ?? [])
        .filter((sentence) => !NAVIGATION_HINT.test(sentence))
        .join("")
        .trim()
    )
    .filter(Boolean)
    .join("\n");
}

// ---------- Groq call ----------

async function callGroq(messages: GroqMessage[], allowTools: boolean): Promise<GroqMessage & { role: "assistant" }> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new AgentError("config", "Missing environment variable GROQ_API_KEY.");

  const body = JSON.stringify({
    model: MODEL,
    messages,
    tools: TOOLS,
    // On the last round, force a text answer
    tool_choice: allowTools ? "auto" : "none",
    // Low: answers must stick to the tool results
    temperature: 0.1,
    max_completion_tokens: 700,
    // gpt-oss is a reasoning model: keep thinking short and out of the reply
    reasoning_effort: "low",
    include_reasoning: false,
  });

  // One retry for Groq's occasional "tool_use_failed" (malformed tool call)
  for (let attempt = 0; attempt < 2; attempt++) {
    let response: Response;
    try {
      response = await fetch(GROQ_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      });
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new AgentError("timeout", "Natagalan ang sagot ng AI. Subukan ulit.");
      }
      throw new AgentError("upstream", "Hindi maabot ang AI service. Subukan ulit.");
    }

    if (response.ok) {
      const parsed = completionSchema.safeParse(await response.json().catch(() => null));
      if (!parsed.success) throw new AgentError("upstream", "Hindi inaasahang sagot mula sa AI.");
      const { content, tool_calls } = parsed.data.choices[0].message;
      return { role: "assistant", content: content ?? null, ...(tool_calls?.length ? { tool_calls } : {}) };
    }

    if (response.status === 429) {
      throw new AgentError("rate-limit", "Maraming gumagamit ng AI ngayon. Subukan ulit pagkalipas ng isang minuto.");
    }
    if (response.status === 401 || response.status === 403) {
      throw new AgentError("config", "Hindi tinanggap ng Groq ang API key.");
    }
    const errorText = await response.text().catch(() => "");
    if (response.status === 400 && errorText.includes("tool_use_failed") && attempt === 0) continue;
    console.error("Groq error", response.status, errorText.slice(0, 300));
    throw new AgentError("upstream", "May problema sa AI service. Subukan ulit.");
  }
  throw new AgentError("upstream", "May problema sa AI service. Subukan ulit.");
}

// ---------- main ----------

export async function runAgent(input: AgentInput): Promise<AgentResponse> {
  const history = (input.history ?? []).slice(-MAX_HISTORY_MESSAGES).map(({ role, content, restrooms }): GroqMessage => {
    const text = content.slice(0, MAX_HISTORY_CHARS);
    if (role === "user" || !restrooms?.length) return { role, content: text };
    // Ids aren't shown to the user, but the model needs them for follow-up tool calls
    const ids = restrooms.map(({ id, name }) => `${name} (id: ${id})`).join("; ");
    return { role, content: `${text}
[Mga CR sa sagot na ito: ${ids}]` };
  });
  const messages: GroqMessage[] = [
    { role: "system", content: systemPrompt(input.location, input.locale) },
    ...history,
    { role: "user", content: input.message },
  ];
  const run: RunState = { found: new Map(), action: null };

  let answer = "";
  for (let step = 0; step < MAX_STEPS; step++) {
    const reply = await callGroq(messages, step < MAX_STEPS - 1);
    const calls = reply.tool_calls ?? [];
    if (calls.length === 0) {
      answer = reply.content ?? "";
      break;
    }

    messages.push(reply);
    // Run this round's tool calls in parallel; a failing tool reports its error to the model
    const results = await Promise.all(
      calls.map((call) =>
        runTool(call, input, run).catch((error: unknown) => {
          if (error instanceof EmbeddingError) return `Error: hindi magamit ang search ngayon (${error.message}).`;
          console.error("Agent tool failed", call.function.name, error);
          return "Error: nagka-problema ang tool. Subukan ang ibang paraan o sabihin sa user.";
        })
      )
    );
    calls.forEach((call, i) => messages.push({ role: "tool", tool_call_id: call.id, content: results[i] }));
  }

  let message = toPlainText(answer);
  // The model sometimes tells the user to press the navigation button even
  // when it didn't call start_navigation (so there is no button). Drop that sentence.
  if (!run.action) message = withoutNavigationHint(message);
  if (!message) message = getDictionary(input.locale).agent.errors.noAnswer;

  // Cards: restrooms the answer mentions by name (or everything found, if none),
  // with the navigation target first.
  const found = Array.from(run.found.values());
  const mentioned = found.filter((restroom) => message.toLowerCase().includes(restroom.name.toLowerCase()));
  const cards = (mentioned.length > 0 ? mentioned : found).sort(
    (a, b) => Number(b.id === run.action?.restroom_id) - Number(a.id === run.action?.restroom_id)
  );

  return {
    message,
    ...(cards.length > 0 ? { restrooms: cards.slice(0, MAX_RESTROOM_CARDS) } : {}),
    ...(run.action ? { action: run.action } : {}),
  };
}
