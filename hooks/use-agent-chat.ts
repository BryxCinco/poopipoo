"use client";

import { useSyncExternalStore } from "react";

import type { LatLng } from "@/types/geo";
import type { AgentAction, AgentErrorResponse, AgentResponse, ChatMessage, RankedRestroom } from "@/types/agent";

/**
 * Chat with Poopipoo Assistant. The conversation lives in a module-level store
 * (memory only), so it survives closing the chat sheet and visiting a
 * restroom page, and is cleared on a full reload.
 */

export interface ChatEntry {
  id: number;
  role: "user" | "assistant";
  content: string;
  restrooms?: RankedRestroom[];
  action?: AgentAction;
  /** A failed request, shown with a retry button */
  failed?: boolean;
}

interface ChatState {
  entries: ChatEntry[];
  pending: boolean;
}

export interface SendResult {
  ok: boolean;
  error?: string;
  code?: AgentErrorResponse["code"];
  retryAfter?: number;
}

const HISTORY_SENT = 6;
const INITIAL: ChatState = { entries: [], pending: false };

let state: ChatState = INITIAL;
let nextId = 1;
const listeners = new Set<() => void>();

function setState(partial: Partial<ChatState>): void {
  state = { ...state, ...partial };
  listeners.forEach((listener) => listener());
}

function isErrorResponse(value: unknown): value is AgentErrorResponse {
  return typeof value === "object" && value !== null && typeof (value as { error?: unknown }).error === "string";
}

function isAgentResponse(value: unknown): value is AgentResponse {
  return typeof value === "object" && value !== null && typeof (value as { message?: unknown }).message === "string";
}

/**
 * Sends `text` to /api/agent. With `retry`, re-sends after a failed attempt
 * (the user's message is already in the list; the error bubble is replaced).
 */
/** Messages for errors that happen before the server answers (in the current language). */
export interface ClientErrorText {
  offline: string;
  generic: string;
  badResponse: string;
}

async function sendMessage(
  text: string,
  location: LatLng | null,
  errorText: ClientErrorText,
  retry = false
): Promise<SendResult> {
  const message = text.trim();
  if (!message || state.pending) return { ok: false };

  // Earlier successful turns, as context for follow-up questions
  const previous = state.entries.filter((entry) => !entry.failed);
  const history: ChatMessage[] = (retry ? previous.slice(0, -1) : previous)
    .slice(-HISTORY_SENT)
    .map(({ role, content, restrooms }) => ({
      role,
      content,
      ...(restrooms?.length ? { restrooms: restrooms.map(({ id, name }) => ({ id, name })) } : {}),
    }));

  const entries = retry
    ? state.entries.filter((entry) => !entry.failed)
    : [...state.entries, { id: nextId++, role: "user" as const, content: message }];
  setState({ entries, pending: true });

  const fail = (error: string, code?: AgentErrorResponse["code"], retryAfter?: number): SendResult => {
    setState({
      pending: false,
      entries: [...state.entries, { id: nextId++, role: "assistant", content: error, failed: true }],
    });
    return { ok: false, error, code, retryAfter };
  };

  let response: Response;
  try {
    response = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        history,
        ...(location ? { user_lat: location.latitude, user_lng: location.longitude } : {}),
      }),
    });
  } catch {
    return fail(errorText.offline, "upstream");
  }

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    return isErrorResponse(data)
      ? fail(data.error, data.code, data.retry_after)
      : fail(errorText.generic, "upstream");
  }
  if (!isAgentResponse(data)) return fail(errorText.badResponse, "upstream");

  setState({
    pending: false,
    entries: [
      ...state.entries,
      { id: nextId++, role: "assistant", content: data.message, restrooms: data.restrooms, action: data.action },
    ],
  });
  return { ok: true };
}

/** The last user message (for retrying after an error). */
function lastUserMessage(): string | null {
  for (let i = state.entries.length - 1; i >= 0; i--) {
    if (state.entries[i].role === "user") return state.entries[i].content;
  }
  return null;
}

function clearChat(): void {
  if (!state.pending) setState({ entries: [] });
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const getSnapshot = () => state;
const getServerSnapshot = () => INITIAL;

export function useAgentChat() {
  const chat = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { ...chat, sendMessage, lastUserMessage, clearChat };
}
