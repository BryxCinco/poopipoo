# API

Poopipoo has four route handlers. Everything else (reading restrooms, adding one, reviews, votes) goes straight from the browser to Supabase with the publishable key, and Row Level Security plus database triggers decide what's allowed (see [database.md](database.md)).

Common rules for all four:

- `POST` with a JSON body. Responses are JSON.
- Auth is the Supabase session cookie. Without it you get `401`.
- Cross-site requests are refused (`403 forbidden`) when the `Origin` header isn't this site.
- Error bodies are `{ "error": "<message in the visitor's language>", "code": "<machine code>" }`. The language comes from the `poopipoo-locale` cookie, or else the `Accept-Language` header.
- Bodies are validated with zod. Invalid input returns `400 invalid`.

## POST /api/agent

Ask the AI assistant.

```json
{
  "message": "May CR ba na may bidet sa Makati?",
  "user_lat": 14.55,
  "user_lng": 121.02,
  "history": [{ "role": "user", "content": "..." }, { "role": "assistant", "content": "...", "restrooms": [{ "id": "<uuid>", "name": "..." }] }]
}
```

- `message`: 1–500 characters. `user_lat`/`user_lng`: optional, both or neither. `history`: up to 20 earlier messages.
- `200`: `{ "message": string, "restrooms"?: RankedRestroom[], "action"?: { "type": "navigate", "restroom_id": "<uuid>" } }`
- Rate limit: 10 questions per minute per user (`429 rate_limited`, with `retry_after` seconds).
- Other errors: `429 ai_busy` (Groq limit), `502/504 upstream`, `503 config`.

How it works: Groq (`openai/gpt-oss-120b`) with tool calling. The `search_restrooms` tool does a vector search (`match_restrooms`, pgvector, Hugging Face embeddings). If embeddings are unavailable it falls back to a keyword search, and "near me" questions use distance only.

## POST /api/report

Report a restroom or review.

```json
{ "target_type": "restroom", "target_id": "<uuid>", "reason": "fake", "details": "optional, max 500" }
```

- `reason`: `fake` | `inappropriate` | `spam` | `duplicate` | `other`
- `201 { "ok": true }`
- `409 already_reported`: one report per person per item.
- `400 own`: you can't report your own content.
- `404 not_found`: the item doesn't exist.
- `403 banned`: the account is banned.
- `429 rate_limited` (+ `retry_at`): more than 10 reports in 24 hours.

The database does the rest: `flag_count + 1`; at 3 reports the item becomes `flagged`, and at 5 it becomes `rejected` (hidden).

## POST /api/verify

"I've seen this": confirm that a restroom exists, or take the confirmation back.

```json
{ "restroom_id": "<uuid>", "action": "verify" }
```

- `action`: `verify` | `unverify`
- `200 { "verified": boolean, "verified_count": number, "status": "pending" | "approved" | "flagged" | "rejected" }`
- `403 not_allowed`: your own restroom, or a rejected one. `403 banned`.

One vote per user per restroom. At 5 votes a `pending` restroom becomes `approved`.

## POST /api/moderate

AI check of a restroom (fake name or address, duplicate, spam, suspicious pattern).

```json
{ "restroom_id": "<uuid>" }
```

- Callable by the restroom's author once (right after adding it), and by moderators at any time.
- `200 { "checked": true, "flagged": boolean }` (moderators also get `result` and `threshold`), or `{ "checked": false, "reason": "already_checked" }`.
- `403 forbidden`, `404 not_found`, `429 ai_busy`, `502/503/504 ai_failed`. If it fails, the restroom stays unchecked and appears on `/moderation`.

The server gives the model facts it computes itself: restrooms within 100 m and how many restrooms the author added in 24 hours. The restroom is flagged only when `is_suspicious` and `confidence > 0.8`.

## Database functions (RPC)

Called with the Supabase client (`supabase.rpc(...)`):

| Function | Who | What |
| --- | --- | --- |
| `my_rate_limit_retry_at()` | signed in | `null` if you can add a restroom now, otherwise when you can |
| `moderate_content(target_type, target_id, decision, reason?)` | moderators | `approve` or `reject` a restroom or review; resolves its reports; logged |
| `ban_user(user_id, reason)` / `unban_user(user_id)` | moderators | Ban hides all of the user's content. Admins can't be banned; only admins can ban moderators |
| `match_restrooms(query_embedding, match_threshold, match_count)` | signed in | Vector search for the assistant |
| `record_ai_moderation(...)`, `check_rate_limit(user_id)` | server only | Used by the server with the secret key |

## Other routes

- `GET /sitemap.xml`: public pages and every non-rejected restroom (rebuilt hourly).
- `GET /robots.txt`
- `GET /opengraph-image`: the share image.
- `GET /auth/callback`, `POST /auth/logout`: Supabase auth.
