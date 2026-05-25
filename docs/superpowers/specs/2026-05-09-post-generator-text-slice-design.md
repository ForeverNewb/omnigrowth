# Post Generator: Text Slice (design)

**Date:** 2026-05-09
**Status:** draft
**Scope:** Text-only post generation, end-to-end through the agent runtime, with Langfuse + Convex observability and a CLI eval rig.

This is the first vertical slice of the post-generator feature (`docs/features/post-generator.md`). It proves the agent runtime, OpenRouter wiring, Langfuse instrumentation, and eval rig with the cheapest+simplest media type. Image and video slices come later via `lib/together` and `lib/wavespeed` (separate specs).

## Requirements

**Hard requirements:**
- Users pick media type only (text/image/video). The UI **never** surfaces model names. See memory `project_llm_hidden_from_users` and `docs/features/post-generator.md` "Model selection" section.
- OpenRouter via the `openai` SDK with custom `baseURL`. Never import `@anthropic-ai/sdk` for production generation calls.
- Folder convention from `docs/architecture.md`: `agents/<name>/` contains `skills.md`, `system-prompt.md`, `config.ts`, `tools/`, `index.ts`.
- Convex actions are the only invocation surface; no separate Node worker.
- Every model call writes a structured run record to Convex `agent_runs` (for in-app queries). A Langfuse trace is also pushed for engineering observability when `LANGFUSE_PUBLIC_KEY` is set; the trace is a no-op without it.
- Brand-scoped: every generation runs in the context of an active `brand_profile`.
- TDD discipline per memory `feedback_tdd_discipline`: tests-first for `lib/` and `convex/` code.

**Out of scope for this slice:**
- Streaming responses (deferred until the chat-agent UI lands).
- Image / video generation (`lib/together`, `lib/wavespeed`).
- Multi-channel drafting in one call. v1 generates for exactly one channel per call.
- Pixel-perfect UI. Minimal wire-up to the existing `/dash/b/[brandId]/generate` stub; will be replaced when the designer's bundle lands.
- Production eval dashboard. The rig ships as a CLI runner; no UI surface yet.
- **OmniBits pricing & debit.** Deferred until agent quality is validated. No balance check, no debit on success. Revisit once we have eval signal on the post-writer agent.

## Architecture

### Layer diagram

```
/dash/b/{brandId}/generate (minimal client UI)
  │
  ▼
convex action: postGenerator.generate({ brandId, brief, channel, tone })
  │
  ├─ load brand_profile (existing query)
  ├─ agents/post-writer.invoke({ brand, brief, channel, tone })
  │   │
  │   ├─ read skills.md + system-prompt.md (cached after first read)
  │   ├─ build [system, user] messages with brand_voice + channel_rules injected
  │   └─ lib/openrouter.chatComplete({ messages, modelChain })
  │       │
  │       ├─ try Claude Sonnet 4.5
  │       ├─ on retry-trigger → GPT-5
  │       ├─ on retry-trigger → Gemini 2.5 Pro
  │       └─ return RunRecord { content, modelUsed, tokensIn, tokensOut, costUsd, latencyMs }
  │
  │   side-effect: Langfuse trace pushed by wrapped openai client (when LANGFUSE_PUBLIC_KEY set)
  │
  ├─ internalMutation persistRunAndDraft({ runFields, draftFields })
  │     atomically inserts agent_runs + postgen_drafts rows
  │     (failure path: persistRunOnly inserts agent_runs with status: failed/refused, no draft row)
  └─ return { draftId, draft }
```

> Note: Convex actions are not transactional. They can call external services (OpenRouter) but cannot atomically write multiple rows. The action invokes the model call, then hands the result to `internalMutation persistRunAndDraft`, which writes both rows in a single mutation (atomic).

### Component map

| Component | Files | Purpose |
|---|---|---|
| **`lib/openrouter/`** | `models.ts` | Typed registry: `OPENROUTER_TEXT_CHAIN` constant + `getModelChain(media)` helper. Throws for `image`/`video` (those go through `lib/together` / `lib/wavespeed`). |
|  | `client.ts` | `createOpenRouterClient({ apiKey })` returns an `openai` SDK instance with `baseURL: "https://openrouter.ai/api/v1"`. |
|  | `trace.ts` | `wrapWithLangfuse(client, { agentId, brandId, userId })` applies `observeOpenAI`. No-op when `LANGFUSE_PUBLIC_KEY` is unset (dev without keys still works). |
|  | `pricing.ts` | Per-model `$ / 1M-token` table for cost calc. Prefers OpenRouter's `usage.cost` from the response when present; falls back to local table. |
|  | `index.ts` | Public API: `chatComplete({ messages, modelChain, signal? }) → RunRecord`. Implements the fallback loop. |
| **`agents/post-writer/`** | `skills.md` | Contract describing purpose, inputs (`brand`, `brief`, `channel`, `tone`), outputs (`{ text }`). Read at runtime. |
|  | `system-prompt.md` | The prompt template with `{{brand_voice}}`, `{{channel_rules}}`, `{{tone}}` placeholders. Read at runtime. |
|  | `channels.ts` | Per-channel rules (char limit, paragraph style, hashtag conventions) for `x` (Twitter/X), `li` (LinkedIn), `ig` (Instagram), `fb` (Facebook), `tt` (TikTok), `yt` (YouTube), `th` (Threads), `pi` (Pinterest). Hard-coded; not fetched. Substituted into `{{channel_rules}}` at invocation time. |
|  | `config.ts` | `modelChainsByMedia` (text uses `OPENROUTER_TEXT_CHAIN`), retry rules. |
|  | `index.ts` | `invoke({ brand, brief, channel, tone }) → AgentResult`. |
| **`convex/agents/`** | `schema.ts` | `agent_runs` table (see Data model below). |
|  | `runs.ts` | `write` (internalMutation), `listByBrandInternal` (internal query, full payload incl. `modelUsed` / `providerUsed` / `costUsd`), `listByBrandPublic` (query, strips model/provider/cost for UI). |
| **`convex/postGenerator/`** | `schema.ts` | `postgen_drafts` table (see Data model below). |
|  | `drafts.ts` | `generate` (action), `persistRunAndDraft` (internalMutation, atomic insert pair), `persistRunOnly` (internalMutation, failure-path), `list` (query), `get` (query), `save` (mutation), `remove` (mutation). |

### Data model

**`agent_runs`** (new in `convex/schema.ts`):
```ts
agent_runs: defineTable({
  agentId: v.string(),              // "post-writer"
  brandId: v.id("brand_profiles"),
  userId: v.id("users"),
  input: v.string(),                // brief
  mediaType: v.union(v.literal("text"), v.literal("image"), v.literal("video")),
  modelUsed: v.string(),            // internal only; stripped from public queries
  providerUsed: v.string(),         // "openrouter"; internal only
  tokensIn: v.number(),
  tokensOut: v.number(),
  costUsd: v.number(),              // engineering telemetry; never shown to users
  latencyMs: v.number(),
  status: v.union(v.literal("ok"), v.literal("failed"), v.literal("refused")),
  output: v.optional(v.string()),
  error: v.optional(v.string()),
  createdAt: v.number(),
})
  .index("by_brand", ["brandId", "createdAt"])
  .index("by_user", ["userId", "createdAt"])
```

**`postgen_drafts`** (new in `convex/schema.ts`):
```ts
postgen_drafts: defineTable({
  brandId: v.id("brand_profiles"),
  userId: v.id("users"),
  brief: v.string(),
  mediaType: v.union(v.literal("text"), v.literal("image"), v.literal("video")),
  channel: v.string(),              // "x" | "li" | "ig" | ...
  tone: v.string(),                 // "warm" | "dry" | "bold"
  text: v.optional(v.string()),     // populated for text drafts
  imageKey: v.optional(v.string()), // R2 object key (later slice)
  videoKey: v.optional(v.string()), // R2 object key (later slice)
  status: v.union(
    v.literal("generated"),
    v.literal("edited"),
    v.literal("scheduled"),
    v.literal("published"),
    v.literal("discarded"),
  ),
  agentRunId: v.id("agent_runs"),   // back-reference; model info reachable via this join (engineering only)
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_brand", ["brandId", "createdAt"])
  .index("by_brand_status", ["brandId", "status"])
```

> `modelUsed` lives only on `agent_runs`, never on `postgen_drafts`. UI surfaces never join through `agentRunId`; that path is reserved for internal/admin queries.

## Error handling

### Inside `lib/openrouter.chatComplete`

**Retry next model on:**
- HTTP 429 (rate limit)
- HTTP 5xx
- Network timeout > 30s
- OpenRouter-specific `provider_unavailable` / `provider_overloaded`

**Don't retry, return as failure:**
- HTTP 400 (malformed prompt; user error, throw `OPENROUTER_BAD_REQUEST`)
- HTTP 401/403 (auth; throw `OPENROUTER_AUTH`, surface to ops)

**Don't retry, return as legitimate completion:**
- Content-policy refusal (the model returned a refusal in normal completion form). Surface to caller as `RunRecord { content: "...", refused: true }`.

**All models fail** → throw `OPENROUTER_CHAIN_EXHAUSTED` with `{ lastError, attemptedModels }`.

### Inside `agents/post-writer.invoke`

- `OPENROUTER_CHAIN_EXHAUSTED` → `AgentError { code: "GEN_FAILED", retryable: true }`
- `RunRecord.refused === true` → `AgentError { code: "GEN_REFUSED", retryable: false }`
- `OPENROUTER_BAD_REQUEST` → `AgentError { code: "GEN_BAD_INPUT", retryable: false }`
- All other errors bubble up.

### Inside `convex/postGenerator.generate` action

- AgentError → call `internalMutation persistRunOnly` with `status: "failed"` (or `"refused"`), error message stored, **no `postgen_drafts` row inserted**, return `ConvexError({ code: agentError.code })` to client.
- Success → call `internalMutation persistRunAndDraft` to insert both `agent_runs` (status: ok) and `postgen_drafts` in a single atomic mutation.

## Testing strategy

Per memory `feedback_tdd_discipline`: TDD for `lib/` and `convex/`, declared explicitly when skipping.

### Unit tests (Vitest)

- `lib/openrouter/models.test.ts`: registry shape, `getModelChain` returns independent copies, unknown media types throw `OPENROUTER_MEDIA_UNSUPPORTED`.
- `lib/openrouter/client.test.ts`: `createOpenRouterClient` constructed with correct `baseURL` + auth header.
- `lib/openrouter/pricing.test.ts`: cost calc per model, falls back to OpenRouter response `usage.cost` when present.
- `lib/openrouter/index.test.ts`: `chatComplete` with a mocked `openai` client:
  - Primary model success → returns `RunRecord` with `modelUsed === primary`.
  - Primary 429 → falls back to next, returns `RunRecord` with `modelUsed === fallback[0]`.
  - All chain entries 5xx → throws `OPENROUTER_CHAIN_EXHAUSTED`.
  - 400 → throws `OPENROUTER_BAD_REQUEST` immediately (no fallback).
  - Refusal → returns `RunRecord { refused: true }`.
- `agents/post-writer/index.test.ts`: translates `lib/openrouter` errors to `AgentError` correctly; builds messages with brand_voice / channel_rules substituted.

### Integration tests (Vitest + convex-test)

- `convex/postGenerator/drafts.test.ts`:
  - Happy path: action returns `{ draftId, draft }`, `postgen_drafts` row exists, `agent_runs` row exists with `status: ok`.
  - Anonymous caller → throws `UNAUTHENTICATED`, no rows inserted.
  - Wrong-brand (brand owned by another user) → throws `NOT_FOUND`, no rows inserted.
  - Agent failure → `agent_runs` row exists with `status: "failed"`, no `postgen_drafts` row.
  - Public query `listByBrandPublic` does NOT include `modelUsed` / `providerUsed` / `costUsd` fields.

### Live test (manual, env-gated)

- `lib/openrouter/live.test.ts`: gated by `OPENROUTER_LIVE_TEST=1`. Sends one tiny real prompt ("Reply with the word 'pong'") to OpenRouter. Asserts response content is non-empty and contains the expected token. Run manually before promoting code.

### Eval rig (later, separate task)

- 10 briefs × 3 channels seed JSON dataset committed at `convex/agents/eval-datasets/post-writer-v1.json`.
- `runEvalSuite(agentId, datasetId)` action runs each input, scores with an LLM-as-judge against criteria (tone-match, length-appropriate, no model-name leakage, no hallucinated facts).
- CLI: `pnpm tsx scripts/run-evals.ts post-writer-v1`.
- Stores `eval_runs` rows for trend tracking. No admin UI surface yet.

## Open questions parked for later

- **OmniBits pricing & debit model.** Fixed-per-call vs computed-from-USD vs tier-based. Revisit when eval rig has signal on the post-writer agent's actual cost-per-good-draft distribution.
- Streaming response shape (`AsyncIterable<RunRecord chunk>` vs server-sent events vs Convex subscribe). Pick when the chat-agent UI lands.
- Prompt versioning. For now `system-prompt.md` is committed in git; the file path is the version. When we want A/B tests, we'll move prompts to Langfuse-hosted templates.
- Cost-based fallback (cheapest-first vs quality-first ordering). Locked to quality-first for v1.

## See also

- `docs/architecture.md`: overall system
- `docs/features/post-generator.md`: feature spec
- `docs/features/agent-runtime.md`: foundational system spec
- Memory: `project_llm_hidden_from_users`, `feedback_tdd_discipline`, `project_openrouter_tts`
