import type { Restroom } from "@/types/restroom";

/** Shared by the /api/agent route (server) and the chat UI (client). */

export interface RankedRestroom extends Restroom {
  /** Cosine similarity to the query (vector search only) */
  similarity: number | null;
  /** Straight-line km from the user, when their location is known */
  distanceKm: number | null;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  /**
   * Restrooms shown with an assistant reply. Sent back as history so the model
   * knows their ids for follow-ups ("dalhin mo ako doon").
   */
  restrooms?: { id: string; name: string }[];
}

export interface AgentAction {
  type: "navigate";
  restroom_id: string;
}

/** 200 response of POST /api/agent */
export interface AgentResponse {
  message: string;
  restrooms?: RankedRestroom[];
  action?: AgentAction;
}

export type AgentErrorCode = "unauthorized" | "invalid" | "rate_limited" | "ai_busy" | "upstream" | "config";

/** Error response of POST /api/agent */
export interface AgentErrorResponse {
  error: string;
  code: AgentErrorCode;
  /** Seconds to wait (rate_limited / ai_busy) */
  retry_after?: number;
}
