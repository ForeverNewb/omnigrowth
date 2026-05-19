# Post Generator: Text Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship text-only post generation end-to-end: brief in, draft out, through the `post-writer` agent → OpenRouter → Convex `agent_runs` + `postgen_drafts`, with Langfuse observability when configured.

**Architecture:** A thin `lib/openrouter` wraps the OpenAI SDK pointed at OpenRouter (with optional Langfuse tracing). A folder-structured `agents/post-writer` reads `skills.md` + `system-prompt.md`, substitutes brand voice and channel rules, and calls the OpenRouter client. A Convex action `postGenerator.generate` calls the agent, then hands the result to an internal mutation that atomically inserts `agent_runs` + `postgen_drafts`. No OmniBits debit this slice (deferred).

**Tech Stack:** Next.js 16 (App Router), Convex, OpenRouter via `openai` SDK, Langfuse (optional), Vitest + convex-test.

**Spec:** `docs/superpowers/specs/2026-05-09-post-generator-text-slice-design.md`

---

## Codebase Conventions (verified)

- Path alias `@/*` maps to repo root (tsconfig.json).
- Feature schemas live at `features/<kebab-case>/schema.ts`, exporting `<name>Schema = {...} as const`.
- `convex/schema.ts` imports each feature schema and spreads them into `defineSchema`.
- Convex function files live at `convex/<camelCase>/<file>.ts` (e.g., `convex/brandProfile/brands.ts`).
- `brand_profiles` row shape: `{ userId, name, description, voice, createdAt, updatedAt }`. **No `audience` field**; the spec's `brand.audience` becomes `brand.description` in code.
- Existing stub at `app/(app)/dash/b/[brandId]/generate/page.tsx` is a placeholder; replace it.
- Existing stub at `lib/openrouter/index.ts` is a throwing placeholder; replace it.
- Package manager: pnpm.

---

## File Map

**Create:**
- `lib/openrouter/models.ts` and `lib/openrouter/models.test.ts`
- `lib/openrouter/pricing.ts` and `lib/openrouter/pricing.test.ts`
- `lib/openrouter/client.ts` and `lib/openrouter/client.test.ts`
- `lib/openrouter/trace.ts` and `lib/openrouter/trace.test.ts`
- `lib/openrouter/index.test.ts`
- `lib/openrouter/live.test.ts`
- `agents/post-writer/channels.ts` and `agents/post-writer/channels.test.ts`
- `agents/post-writer/skills.md`
- `agents/post-writer/system-prompt.md`
- `agents/post-writer/config.ts`
- `agents/post-writer/index.ts` and `agents/post-writer/index.test.ts`
- `features/agents/schema.ts`
- `convex/agents/runs.ts` and `convex/agents/runs.test.ts`
- `convex/postGenerator/drafts.ts` and `convex/postGenerator/drafts.test.ts`

**Modify:**
- `package.json` (add `openai`, `langfuse`)
- `lib/openrouter/index.ts` (replace stub)
- `features/post-generator/schema.ts` (add `postgen_drafts` table)
- `convex/schema.ts` (import + spread `agentsSchema`)
- `app/(app)/dash/b/[brandId]/generate/page.tsx` (replace stub with working UI)

---

## Task 0: Read prerequisites

**Files:** none (read-only)

- [ ] **Step 1: Read the spec end-to-end**

Read `docs/superpowers/specs/2026-05-09-post-generator-text-slice-design.md`. Note the data model and error handling sections.

- [ ] **Step 2: Confirm existing brand_profile shape**

Run: `cat features/brand-profile/schema.ts`
Confirm `brand_profiles` exposes `{ userId, name, description, voice }`. The agent will receive `description` where the spec said `audience`.

- [ ] **Step 3: Confirm convex auth pattern**

Run: `cat convex/brandProfile/brands.ts | head -60`
Note how mutations/actions get the current user (likely `await getAuthUserId(ctx)` from `@convex-dev/auth/server`). The `generate` action must follow this pattern.

- [ ] **Step 4: Verify OPENROUTER_API_KEY is set**

Run: `grep '^OPENROUTER_API_KEY=' .env.local`
Expected: a non-empty value. If empty, stop and have the user populate it.

---

## Task 1: Install dependencies

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`

- [ ] **Step 1: Install `openai` and `langfuse`**

Run: `pnpm add openai langfuse`
Expected: both packages added under `dependencies` in `package.json`.

- [ ] **Step 2: Verify installs**

Run: `pnpm list openai langfuse --depth 0`
Expected: both listed with concrete versions.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat(deps): add openai and langfuse for post-generator text slice"
```

---

## Task 2: lib/openrouter/models.ts (registry + media gate)

**Files:**
- Create: `lib/openrouter/models.ts`
- Test: `lib/openrouter/models.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/openrouter/models.test.ts
import { describe, expect, it } from "vitest";
import { OPENROUTER_TEXT_CHAIN, getModelChain, type MediaType } from "./models";

describe("OPENROUTER_TEXT_CHAIN", () => {
  it("lists the text model fallback order", () => {
    expect(OPENROUTER_TEXT_CHAIN).toEqual([
      "anthropic/claude-sonnet-4-6",
      "openai/gpt-5",
      "google/gemini-2.5-pro",
    ]);
  });
});

describe("getModelChain", () => {
  it("returns the text chain for media='text'", () => {
    expect(getModelChain("text")).toEqual([...OPENROUTER_TEXT_CHAIN]);
  });

  it("returns a fresh copy each call (mutation of one does not affect the other)", () => {
    const a = getModelChain("text");
    const b = getModelChain("text");
    a.push("evil/model");
    expect(b).not.toContain("evil/model");
  });

  it("throws OPENROUTER_MEDIA_UNSUPPORTED for image", () => {
    expect(() => getModelChain("image" as MediaType)).toThrow(/OPENROUTER_MEDIA_UNSUPPORTED/);
  });

  it("throws OPENROUTER_MEDIA_UNSUPPORTED for video", () => {
    expect(() => getModelChain("video" as MediaType)).toThrow(/OPENROUTER_MEDIA_UNSUPPORTED/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run lib/openrouter/models.test.ts`
Expected: FAIL with "Cannot find module './models'" or similar.

- [ ] **Step 3: Implement**

```ts
// lib/openrouter/models.ts
export type MediaType = "text" | "image" | "video";

export const OPENROUTER_TEXT_CHAIN = [
  "anthropic/claude-sonnet-4-6",
  "openai/gpt-5",
  "google/gemini-2.5-pro",
] as const;

export type OpenRouterTextModel = (typeof OPENROUTER_TEXT_CHAIN)[number];

export function getModelChain(media: MediaType): string[] {
  if (media !== "text") {
    throw new Error(
      `OPENROUTER_MEDIA_UNSUPPORTED: media='${media}' must go through lib/together or lib/wavespeed`,
    );
  }
  return [...OPENROUTER_TEXT_CHAIN];
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run lib/openrouter/models.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/openrouter/models.ts lib/openrouter/models.test.ts
git commit -m "feat(openrouter): add text model chain registry"
```

---

## Task 3: lib/openrouter/pricing.ts (cost table + fallback)

**Files:**
- Create: `lib/openrouter/pricing.ts`
- Test: `lib/openrouter/pricing.test.ts`

> **Note:** Prices below are placeholders matching public list prices as of plan-write date. Engineer should verify and update if OpenRouter pricing has shifted; the test asserts the same numbers in the impl so they stay in sync.

- [ ] **Step 1: Write the failing test**

```ts
// lib/openrouter/pricing.test.ts
import { describe, expect, it } from "vitest";
import { computeCostUsd, MODEL_PRICING } from "./pricing";

describe("computeCostUsd", () => {
  it("prefers OpenRouter's reported cost when provided", () => {
    const cost = computeCostUsd({
      model: "anthropic/claude-sonnet-4-6",
      tokensIn: 1000,
      tokensOut: 500,
      providerCost: 0.0123,
    });
    expect(cost).toBe(0.0123);
  });

  it("falls back to local table for Claude Sonnet 4.6", () => {
    const cost = computeCostUsd({
      model: "anthropic/claude-sonnet-4-6",
      tokensIn: 1_000_000,
      tokensOut: 1_000_000,
    });
    // $3 input + $15 output per 1M tokens
    expect(cost).toBeCloseTo(18, 4);
  });

  it("falls back to local table for GPT-5", () => {
    const cost = computeCostUsd({
      model: "openai/gpt-5",
      tokensIn: 1_000_000,
      tokensOut: 1_000_000,
    });
    // $1.25 input + $10 output per 1M tokens
    expect(cost).toBeCloseTo(11.25, 4);
  });

  it("falls back to local table for Gemini 2.5 Pro", () => {
    const cost = computeCostUsd({
      model: "google/gemini-2.5-pro",
      tokensIn: 1_000_000,
      tokensOut: 1_000_000,
    });
    // $1.25 input + $5 output per 1M tokens
    expect(cost).toBeCloseTo(6.25, 4);
  });

  it("returns 0 for unknown model when providerCost is missing", () => {
    const cost = computeCostUsd({
      model: "unknown/model",
      tokensIn: 1000,
      tokensOut: 500,
    });
    expect(cost).toBe(0);
  });

  it("MODEL_PRICING includes every model in OPENROUTER_TEXT_CHAIN", async () => {
    const { OPENROUTER_TEXT_CHAIN } = await import("./models");
    for (const model of OPENROUTER_TEXT_CHAIN) {
      expect(MODEL_PRICING[model]).toBeDefined();
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run lib/openrouter/pricing.test.ts`
Expected: FAIL with "Cannot find module './pricing'".

- [ ] **Step 3: Implement**

```ts
// lib/openrouter/pricing.ts
export type ModelPricing = {
  /** USD per 1M input tokens */
  inputPerMillion: number;
  /** USD per 1M output tokens */
  outputPerMillion: number;
};

export const MODEL_PRICING: Record<string, ModelPricing> = {
  "anthropic/claude-sonnet-4-6": { inputPerMillion: 3, outputPerMillion: 15 },
  "openai/gpt-5": { inputPerMillion: 1.25, outputPerMillion: 10 },
  "google/gemini-2.5-pro": { inputPerMillion: 1.25, outputPerMillion: 5 },
};

export type ComputeCostInput = {
  model: string;
  tokensIn: number;
  tokensOut: number;
  /** OpenRouter sometimes attaches a usage.cost field; prefer that when present. */
  providerCost?: number;
};

export function computeCostUsd(input: ComputeCostInput): number {
  if (typeof input.providerCost === "number") return input.providerCost;
  const price = MODEL_PRICING[input.model];
  if (!price) return 0;
  return (
    (input.tokensIn / 1_000_000) * price.inputPerMillion +
    (input.tokensOut / 1_000_000) * price.outputPerMillion
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run lib/openrouter/pricing.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/openrouter/pricing.ts lib/openrouter/pricing.test.ts
git commit -m "feat(openrouter): add per-model pricing table"
```

---

## Task 4: lib/openrouter/client.ts (OpenAI SDK wrapper)

**Files:**
- Create: `lib/openrouter/client.ts`
- Test: `lib/openrouter/client.test.ts`

- [ ] **Step 1: Check `openai` SDK docs via context7**

Use context7 to confirm `new OpenAI({ apiKey, baseURL })` is the current public constructor signature in the installed `openai` version, and that `client.baseURL` / `client.apiKey` are readable on the instance.

- [ ] **Step 2: Write the failing test**

```ts
// lib/openrouter/client.test.ts
import { describe, expect, it } from "vitest";
import { createOpenRouterClient } from "./client";

describe("createOpenRouterClient", () => {
  it("returns an OpenAI SDK instance pointed at OpenRouter", () => {
    const client = createOpenRouterClient({ apiKey: "test-key" });
    expect(client.baseURL).toBe("https://openrouter.ai/api/v1");
    expect(client.apiKey).toBe("test-key");
  });

  it("supports a custom referrer + title via defaultHeaders", () => {
    const client = createOpenRouterClient({
      apiKey: "test-key",
      referrer: "https://omnigrowth.test",
      appTitle: "OmniGrowth (test)",
    });
    expect(client.baseURL).toBe("https://openrouter.ai/api/v1");
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm vitest run lib/openrouter/client.test.ts`
Expected: FAIL with "Cannot find module './client'".

- [ ] **Step 4: Implement**

```ts
// lib/openrouter/client.ts
import OpenAI from "openai";

export type OpenRouterClientOpts = {
  apiKey: string;
  /** Sent as HTTP-Referer; OpenRouter uses this for the rankings page. Optional. */
  referrer?: string;
  /** Sent as X-Title; appears in OpenRouter's dashboard. Optional. */
  appTitle?: string;
};

export function createOpenRouterClient(opts: OpenRouterClientOpts): OpenAI {
  const defaultHeaders: Record<string, string> = {};
  if (opts.referrer) defaultHeaders["HTTP-Referer"] = opts.referrer;
  if (opts.appTitle) defaultHeaders["X-Title"] = opts.appTitle;
  return new OpenAI({
    apiKey: opts.apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders,
  });
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm vitest run lib/openrouter/client.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 6: Commit**

```bash
git add lib/openrouter/client.ts lib/openrouter/client.test.ts
git commit -m "feat(openrouter): add OpenAI SDK client pointed at OpenRouter"
```

---

## Task 5: lib/openrouter/trace.ts (Langfuse wrapper, optional)

**Files:**
- Create: `lib/openrouter/trace.ts`
- Test: `lib/openrouter/trace.test.ts`

- [ ] **Step 1: Check `langfuse` SDK docs via context7**

Use context7 to confirm the current API for wrapping an OpenAI client with Langfuse. As of this plan, the helper is `observeOpenAI(client, options)` exported from `langfuse`. Confirm:
- The exact import path (`langfuse` vs `langfuse-node` vs subpath).
- The options shape — at minimum `generationName` and `metadata`.
- That it no-ops or fails gracefully when `LANGFUSE_PUBLIC_KEY` is unset (we wrap our own guard regardless).

- [ ] **Step 2: Write the failing test**

```ts
// lib/openrouter/trace.test.ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createOpenRouterClient } from "./client";
import { wrapWithLangfuse } from "./trace";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  delete process.env.LANGFUSE_PUBLIC_KEY;
  delete process.env.LANGFUSE_SECRET_KEY;
  delete process.env.LANGFUSE_BASEURL;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("wrapWithLangfuse", () => {
  it("returns the same client when LANGFUSE_PUBLIC_KEY is unset", () => {
    const client = createOpenRouterClient({ apiKey: "test" });
    const wrapped = wrapWithLangfuse(client, {
      agentId: "post-writer",
      brandId: "b1",
      userId: "u1",
    });
    expect(wrapped).toBe(client);
  });

  it("returns a wrapped (different) client when LANGFUSE_PUBLIC_KEY is set", () => {
    process.env.LANGFUSE_PUBLIC_KEY = "pk-test";
    process.env.LANGFUSE_SECRET_KEY = "sk-test";
    const client = createOpenRouterClient({ apiKey: "test" });
    const wrapped = wrapWithLangfuse(client, {
      agentId: "post-writer",
      brandId: "b1",
      userId: "u1",
    });
    expect(wrapped).not.toBe(client);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm vitest run lib/openrouter/trace.test.ts`
Expected: FAIL with "Cannot find module './trace'".

- [ ] **Step 4: Implement**

```ts
// lib/openrouter/trace.ts
import type OpenAI from "openai";
import { observeOpenAI } from "langfuse";

export type TraceContext = {
  agentId: string;
  brandId: string;
  userId: string;
};

/**
 * Wrap an OpenAI client with Langfuse tracing. No-op when LANGFUSE_PUBLIC_KEY
 * is unset so dev environments without Langfuse credentials still work.
 */
export function wrapWithLangfuse(client: OpenAI, ctx: TraceContext): OpenAI {
  if (!process.env.LANGFUSE_PUBLIC_KEY) return client;
  return observeOpenAI(client, {
    generationName: ctx.agentId,
    metadata: { brandId: ctx.brandId, userId: ctx.userId },
  }) as unknown as OpenAI;
}
```

> If context7 reveals a different langfuse export name (e.g. wrapper is on a different package), update the import accordingly and adjust the test to match (e.g. switch the wrapped-different-from-original assertion to whatever the wrapper's public surface allows).

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm vitest run lib/openrouter/trace.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 6: Commit**

```bash
git add lib/openrouter/trace.ts lib/openrouter/trace.test.ts
git commit -m "feat(openrouter): add optional Langfuse wrapper"
```

---

## Task 6: lib/openrouter/index.ts (chatComplete with fallback chain)

**Files:**
- Modify: `lib/openrouter/index.ts` (replace existing stub)
- Test: `lib/openrouter/index.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// lib/openrouter/index.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const createChatCompletionMock = vi.fn();

vi.mock("./client", () => ({
  createOpenRouterClient: () => ({
    chat: { completions: { create: createChatCompletionMock } },
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: "test",
  }),
}));

// Force the Langfuse wrapper to be a no-op for these tests.
vi.mock("./trace", () => ({
  wrapWithLangfuse: <T,>(c: T) => c,
}));

import { chatComplete, OpenRouterError } from "./index";

class HttpError extends Error {
  constructor(public status: number, message = `HTTP ${status}`) {
    super(message);
  }
}

const baseArgs = {
  apiKey: "test",
  messages: [{ role: "user" as const, content: "hi" }],
  modelChain: ["anthropic/claude-sonnet-4-6", "openai/gpt-5", "google/gemini-2.5-pro"],
};

function okResponse(content: string, model: string) {
  return {
    choices: [{ message: { content }, finish_reason: "stop" }],
    usage: { prompt_tokens: 10, completion_tokens: 20 },
    model,
  };
}

beforeEach(() => {
  createChatCompletionMock.mockReset();
});

describe("chatComplete", () => {
  it("returns RunRecord on primary model success", async () => {
    createChatCompletionMock.mockResolvedValueOnce(
      okResponse("hello world", "anthropic/claude-sonnet-4-6"),
    );
    const result = await chatComplete(baseArgs);
    expect(result.content).toBe("hello world");
    expect(result.modelUsed).toBe("anthropic/claude-sonnet-4-6");
    expect(result.tokensIn).toBe(10);
    expect(result.tokensOut).toBe(20);
    expect(result.refused).toBe(false);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("falls back on 429 from primary, returns next model's record", async () => {
    createChatCompletionMock.mockRejectedValueOnce(new HttpError(429));
    createChatCompletionMock.mockResolvedValueOnce(okResponse("ok", "openai/gpt-5"));
    const result = await chatComplete(baseArgs);
    expect(result.modelUsed).toBe("openai/gpt-5");
  });

  it("falls back on 5xx", async () => {
    createChatCompletionMock.mockRejectedValueOnce(new HttpError(503));
    createChatCompletionMock.mockResolvedValueOnce(okResponse("ok", "openai/gpt-5"));
    const result = await chatComplete(baseArgs);
    expect(result.modelUsed).toBe("openai/gpt-5");
  });

  it("throws OPENROUTER_CHAIN_EXHAUSTED when every model 5xxs", async () => {
    createChatCompletionMock.mockRejectedValue(new HttpError(503));
    await expect(chatComplete(baseArgs)).rejects.toMatchObject({
      name: "OPENROUTER_CHAIN_EXHAUSTED",
    });
  });

  it("throws OPENROUTER_BAD_REQUEST immediately on 400, no fallback", async () => {
    createChatCompletionMock.mockRejectedValueOnce(new HttpError(400));
    await expect(chatComplete(baseArgs)).rejects.toMatchObject({
      name: "OPENROUTER_BAD_REQUEST",
    });
    expect(createChatCompletionMock).toHaveBeenCalledTimes(1);
  });

  it("throws OPENROUTER_AUTH on 401, no fallback", async () => {
    createChatCompletionMock.mockRejectedValueOnce(new HttpError(401));
    await expect(chatComplete(baseArgs)).rejects.toMatchObject({
      name: "OPENROUTER_AUTH",
    });
  });

  it("returns RunRecord with refused: true when finish_reason is content_filter", async () => {
    createChatCompletionMock.mockResolvedValueOnce({
      choices: [{ message: { content: "I can't help with that." }, finish_reason: "content_filter" }],
      usage: { prompt_tokens: 5, completion_tokens: 8 },
      model: "anthropic/claude-sonnet-4-6",
    });
    const result = await chatComplete(baseArgs);
    expect(result.refused).toBe(true);
    expect(result.content).toBe("I can't help with that.");
  });
});

describe("OpenRouterError", () => {
  it("exposes the code as .name", () => {
    const err = new OpenRouterError("OPENROUTER_BAD_REQUEST", "bad input");
    expect(err.name).toBe("OPENROUTER_BAD_REQUEST");
    expect(err.message).toBe("bad input");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run lib/openrouter/index.test.ts`
Expected: FAIL (existing stub throws "not implemented yet" or types don't match).

- [ ] **Step 3: Replace the stub with the real implementation**

```ts
// lib/openrouter/index.ts
import { createOpenRouterClient } from "./client";
import { computeCostUsd } from "./pricing";
import { wrapWithLangfuse, type TraceContext } from "./trace";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatCompleteInput = {
  apiKey: string;
  messages: ChatMessage[];
  modelChain: string[];
  traceContext?: TraceContext;
  signal?: AbortSignal;
};

export type RunRecord = {
  content: string;
  modelUsed: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  latencyMs: number;
  refused: boolean;
};

export class OpenRouterError extends Error {
  constructor(
    public code:
      | "OPENROUTER_BAD_REQUEST"
      | "OPENROUTER_AUTH"
      | "OPENROUTER_CHAIN_EXHAUSTED",
    message: string,
    public data?: Record<string, unknown>,
  ) {
    super(message);
    this.name = code;
  }
}

function errorStatus(err: unknown): number | undefined {
  return (err as { status?: number; response?: { status?: number } } | null)?.status
    ?? (err as { response?: { status?: number } } | null)?.response?.status;
}

function shouldRetry(err: unknown): boolean {
  const status = errorStatus(err);
  if (status === 429) return true;
  if (typeof status === "number" && status >= 500 && status < 600) return true;
  const code = (err as { code?: string } | null)?.code;
  if (code === "ETIMEDOUT" || code === "ECONNRESET") return true;
  return false;
}

const REFUSAL_HINTS = [/^i (?:can'?t|cannot|won'?t)\b/i, /\bi'?m not able to\b/i];

function detectRefusal(finishReason: string | undefined, content: string): boolean {
  if (finishReason === "content_filter") return true;
  return REFUSAL_HINTS.some((re) => re.test(content.trim()));
}

export async function chatComplete(input: ChatCompleteInput): Promise<RunRecord> {
  const baseClient = createOpenRouterClient({ apiKey: input.apiKey });
  const client = input.traceContext
    ? wrapWithLangfuse(baseClient, input.traceContext)
    : baseClient;

  const attempted: string[] = [];
  let lastError: unknown;

  for (const model of input.modelChain) {
    attempted.push(model);
    const startedAt = Date.now();
    try {
      const resp = await client.chat.completions.create(
        { model, messages: input.messages },
        { signal: input.signal },
      );
      const choice = resp.choices[0];
      const content = choice?.message?.content ?? "";
      const finishReason = choice?.finish_reason;
      const tokensIn = resp.usage?.prompt_tokens ?? 0;
      const tokensOut = resp.usage?.completion_tokens ?? 0;
      const providerCost = (resp.usage as { cost?: number } | undefined)?.cost;
      const costUsd = computeCostUsd({ model, tokensIn, tokensOut, providerCost });
      return {
        content,
        modelUsed: model,
        tokensIn,
        tokensOut,
        costUsd,
        latencyMs: Date.now() - startedAt,
        refused: detectRefusal(finishReason ?? undefined, content),
      };
    } catch (err) {
      lastError = err;
      const status = errorStatus(err);
      if (status === 400) {
        throw new OpenRouterError("OPENROUTER_BAD_REQUEST", String((err as Error)?.message ?? err));
      }
      if (status === 401 || status === 403) {
        throw new OpenRouterError("OPENROUTER_AUTH", String((err as Error)?.message ?? err));
      }
      if (!shouldRetry(err)) throw err;
      // else continue to next model
    }
  }

  throw new OpenRouterError(
    "OPENROUTER_CHAIN_EXHAUSTED",
    `All ${attempted.length} models failed`,
    { attemptedModels: attempted, lastError: String(lastError) },
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run lib/openrouter/index.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Run typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/openrouter/index.ts lib/openrouter/index.test.ts
git commit -m "feat(openrouter): implement chatComplete with model fallback chain"
```

---

## Task 7: lib/openrouter/live.test.ts (env-gated smoke test)

**Files:**
- Create: `lib/openrouter/live.test.ts`

- [ ] **Step 1: Write the live test**

```ts
// lib/openrouter/live.test.ts
import { describe, expect, it } from "vitest";
import { chatComplete } from "./index";
import { OPENROUTER_TEXT_CHAIN } from "./models";

const LIVE = process.env.OPENROUTER_LIVE_TEST === "1";
const apiKey = process.env.OPENROUTER_API_KEY ?? "";

describe.skipIf(!LIVE)("chatComplete (live)", () => {
  it("returns a non-empty response from a real OpenRouter call", async () => {
    if (!apiKey) throw new Error("OPENROUTER_API_KEY required for live test");
    const result = await chatComplete({
      apiKey,
      modelChain: [...OPENROUTER_TEXT_CHAIN],
      messages: [{ role: "user", content: "Reply with the single word 'pong'." }],
    });
    expect(result.content.toLowerCase()).toContain("pong");
    expect(result.tokensIn).toBeGreaterThan(0);
    expect(result.tokensOut).toBeGreaterThan(0);
    expect(result.latencyMs).toBeGreaterThan(0);
    expect(result.refused).toBe(false);
  }, 60_000);
});
```

- [ ] **Step 2: Verify the test is skipped by default**

Run: `pnpm vitest run lib/openrouter/live.test.ts`
Expected: 1 test, skipped (LIVE flag off).

- [ ] **Step 3: Verify the test runs (manual, optional)**

Run: `OPENROUTER_LIVE_TEST=1 pnpm vitest run lib/openrouter/live.test.ts`
Expected: PASS (consumes a tiny amount of credit). Skip if you don't want to spend credits.

- [ ] **Step 4: Commit**

```bash
git add lib/openrouter/live.test.ts
git commit -m "test(openrouter): add env-gated live smoke test"
```

---

## Task 8: agents/post-writer/channels.ts (per-channel rules)

**Files:**
- Create: `agents/post-writer/channels.ts`
- Test: `agents/post-writer/channels.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// agents/post-writer/channels.test.ts
import { describe, expect, it } from "vitest";
import { CHANNELS, renderChannelRules, type Channel } from "./channels";

describe("CHANNELS", () => {
  it("includes all 8 channel codes", () => {
    expect(Object.keys(CHANNELS).sort()).toEqual([
      "fb",
      "ig",
      "li",
      "pi",
      "th",
      "tt",
      "x",
      "yt",
    ]);
  });

  it("Twitter/X has a 280-char limit", () => {
    expect(CHANNELS.x.charLimit).toBe(280);
  });

  it("Threads has a 500-char limit", () => {
    expect(CHANNELS.th.charLimit).toBe(500);
  });
});

describe("renderChannelRules", () => {
  it("returns text with channel name and char limit", () => {
    const out = renderChannelRules("x");
    expect(out).toContain("X (Twitter)");
    expect(out).toContain("Character limit: 280");
  });

  it("notes 'Hashtags: none' for channels that disallow hashtags", () => {
    const out = renderChannelRules("fb");
    expect(out).toContain("Hashtags: none");
  });

  it("notes hashtag max for channels that allow them", () => {
    const out = renderChannelRules("ig");
    expect(out).toMatch(/Hashtags: up to \d+/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run agents/post-writer/channels.test.ts`
Expected: FAIL with "Cannot find module './channels'".

- [ ] **Step 3: Implement**

```ts
// agents/post-writer/channels.ts
export type Channel = "x" | "li" | "ig" | "fb" | "tt" | "yt" | "th" | "pi";

export type ChannelRules = {
  code: Channel;
  name: string;
  charLimit: number;
  paragraphStyle: "single" | "short" | "long";
  hashtags: { use: boolean; max: number };
};

export const CHANNELS: Record<Channel, ChannelRules> = {
  x:  { code: "x",  name: "X (Twitter)", charLimit: 280,   paragraphStyle: "single", hashtags: { use: true,  max: 2 } },
  li: { code: "li", name: "LinkedIn",    charLimit: 3000,  paragraphStyle: "short",  hashtags: { use: true,  max: 5 } },
  ig: { code: "ig", name: "Instagram",   charLimit: 2200,  paragraphStyle: "short",  hashtags: { use: true,  max: 10 } },
  fb: { code: "fb", name: "Facebook",    charLimit: 63206, paragraphStyle: "long",   hashtags: { use: false, max: 0 } },
  tt: { code: "tt", name: "TikTok",      charLimit: 2200,  paragraphStyle: "single", hashtags: { use: true,  max: 5 } },
  yt: { code: "yt", name: "YouTube",     charLimit: 5000,  paragraphStyle: "long",   hashtags: { use: true,  max: 3 } },
  th: { code: "th", name: "Threads",     charLimit: 500,   paragraphStyle: "single", hashtags: { use: true,  max: 2 } },
  pi: { code: "pi", name: "Pinterest",   charLimit: 500,   paragraphStyle: "short",  hashtags: { use: true,  max: 3 } },
};

export function isChannel(value: string): value is Channel {
  return value in CHANNELS;
}

export function renderChannelRules(channel: Channel): string {
  const c = CHANNELS[channel];
  const hashtagLine = c.hashtags.use
    ? `Hashtags: up to ${c.hashtags.max} relevant tags.`
    : `Hashtags: none.`;
  return [
    `Channel: ${c.name}`,
    `Character limit: ${c.charLimit}.`,
    `Paragraph style: ${c.paragraphStyle}.`,
    hashtagLine,
  ].join("\n");
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run agents/post-writer/channels.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add agents/post-writer/channels.ts agents/post-writer/channels.test.ts
git commit -m "feat(agents/post-writer): add per-channel rules"
```

---

## Task 9: agents/post-writer/skills.md and system-prompt.md

**Files:**
- Create: `agents/post-writer/skills.md`
- Create: `agents/post-writer/system-prompt.md`

> Skip TDD for prompt files. These are static content with no runtime logic, asserted indirectly by the substitution test in Task 11.

- [ ] **Step 1: Write `skills.md`**

```markdown
# post-writer

## Purpose
Generate a social-media post draft from a brief, scoped to one channel and one tone.

## Inputs
- `brand`: `{ name, voice, description }` from `brand_profiles`
- `brief`: free-text user request (1 to 3 sentences)
- `channel`: one of `x`, `li`, `ig`, `fb`, `tt`, `yt`, `th`, `pi`
- `tone`: `"warm" | "dry" | "bold"`

## Outputs
- `{ text: string }`: ready-to-paste post content

## Boundaries
- Single channel per call; multi-channel orchestration belongs higher in the stack.
- Plain text only for this slice; image/video are separate agents.
- Refusals from upstream models surface as `AgentError { code: "GEN_REFUSED" }`.
```

- [ ] **Step 2: Write `system-prompt.md`**

```markdown
You write social-media posts that match a brand's voice and a target channel's conventions.

## Brand voice
{{brand_voice}}

## Channel rules
{{channel_rules}}

## Tone for this draft
{{tone}}

## Output rules
- Return only the post content. No preamble, no commentary, no markdown headings.
- Respect the channel's character limit.
- Match the requested tone consistently across the post.
```

- [ ] **Step 3: Commit**

```bash
git add agents/post-writer/skills.md agents/post-writer/system-prompt.md
git commit -m "feat(agents/post-writer): add skills.md and system-prompt.md"
```

---

## Task 10: agents/post-writer/config.ts

**Files:**
- Create: `agents/post-writer/config.ts`

> Trivial constant export; no behavior to test. The downstream `index.ts` test exercises that config.text resolves to the text chain.

- [ ] **Step 1: Implement**

```ts
// agents/post-writer/config.ts
import { OPENROUTER_TEXT_CHAIN } from "@/lib/openrouter/models";

export const modelChainsByMedia = {
  text: OPENROUTER_TEXT_CHAIN,
} as const;

export const retryRules = {
  /** Per-model attempts handled inside lib/openrouter; agent-level retries are deferred. */
  maxAttemptsPerModel: 1,
  timeoutMs: 30_000,
} as const;
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add agents/post-writer/config.ts
git commit -m "feat(agents/post-writer): add config with text model chain"
```

---

## Task 11: agents/post-writer/index.ts (invoke)

**Files:**
- Create: `agents/post-writer/index.ts`
- Test: `agents/post-writer/index.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// agents/post-writer/index.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const chatCompleteMock = vi.fn();

vi.mock("@/lib/openrouter", () => ({
  chatComplete: chatCompleteMock,
  OpenRouterError: class OpenRouterError extends Error {
    constructor(public code: string, message: string) {
      super(message);
      this.name = code;
    }
  },
}));

import { OpenRouterError } from "@/lib/openrouter";
import { AgentError, invoke } from "./index";

const baseInput = {
  brand: { name: "Acme", voice: "warm and direct", description: "small business CRM" },
  brief: "Announce our new pricing tier",
  channel: "x" as const,
  tone: "warm" as const,
  apiKey: "test-key",
};

const okRecord = {
  content: "We're rolling out flexible pricing.",
  modelUsed: "anthropic/claude-sonnet-4-6",
  tokensIn: 100,
  tokensOut: 50,
  costUsd: 0.001,
  latencyMs: 250,
  refused: false,
};

beforeEach(() => {
  chatCompleteMock.mockReset();
});

describe("post-writer invoke", () => {
  it("returns text + telemetry on success", async () => {
    chatCompleteMock.mockResolvedValueOnce(okRecord);
    const result = await invoke(baseInput);
    expect(result.text).toBe("We're rolling out flexible pricing.");
    expect(result.modelUsed).toBe("anthropic/claude-sonnet-4-6");
    expect(result.tokensIn).toBe(100);
    expect(result.tokensOut).toBe(50);
    expect(result.costUsd).toBe(0.001);
  });

  it("substitutes brand_voice and channel_rules into the system message", async () => {
    chatCompleteMock.mockResolvedValueOnce(okRecord);
    await invoke(baseInput);
    const callArg = chatCompleteMock.mock.calls[0][0];
    const systemMsg = callArg.messages.find((m: { role: string }) => m.role === "system");
    expect(systemMsg.content).toContain("warm and direct");
    expect(systemMsg.content).toContain("X (Twitter)");
    expect(systemMsg.content).toContain("Character limit: 280");
    expect(systemMsg.content).toContain("warm"); // tone
  });

  it("passes the user brief as the user message", async () => {
    chatCompleteMock.mockResolvedValueOnce(okRecord);
    await invoke(baseInput);
    const callArg = chatCompleteMock.mock.calls[0][0];
    const userMsg = callArg.messages.find((m: { role: string }) => m.role === "user");
    expect(userMsg.content).toBe("Announce our new pricing tier");
  });

  it("throws GEN_REFUSED when the model refuses", async () => {
    chatCompleteMock.mockResolvedValueOnce({
      ...okRecord,
      content: "I can't help with that.",
      refused: true,
    });
    await expect(invoke(baseInput)).rejects.toMatchObject({
      name: "GEN_REFUSED",
    });
  });

  it("translates OPENROUTER_BAD_REQUEST to GEN_BAD_INPUT (non-retryable)", async () => {
    chatCompleteMock.mockRejectedValueOnce(new OpenRouterError("OPENROUTER_BAD_REQUEST", "bad"));
    await expect(invoke(baseInput)).rejects.toMatchObject({
      name: "GEN_BAD_INPUT",
      retryable: false,
    });
  });

  it("translates OPENROUTER_CHAIN_EXHAUSTED to GEN_FAILED (retryable)", async () => {
    chatCompleteMock.mockRejectedValueOnce(new OpenRouterError("OPENROUTER_CHAIN_EXHAUSTED", "all failed"));
    await expect(invoke(baseInput)).rejects.toMatchObject({
      name: "GEN_FAILED",
      retryable: true,
    });
  });

  it("bubbles up unknown errors", async () => {
    chatCompleteMock.mockRejectedValueOnce(new Error("random failure"));
    await expect(invoke(baseInput)).rejects.toThrow("random failure");
  });
});

describe("AgentError", () => {
  it("exposes code as .name and retryable", () => {
    const err = new AgentError("GEN_FAILED", "boom", true);
    expect(err.name).toBe("GEN_FAILED");
    expect(err.retryable).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run agents/post-writer/index.test.ts`
Expected: FAIL with "Cannot find module './index'".

- [ ] **Step 3: Implement**

```ts
// agents/post-writer/index.ts
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { chatComplete, OpenRouterError, type ChatMessage } from "@/lib/openrouter";
import type { TraceContext } from "@/lib/openrouter/trace";
import { renderChannelRules, type Channel } from "./channels";
import { modelChainsByMedia } from "./config";

const AGENT_DIR = join(process.cwd(), "agents", "post-writer");

let cachedSystemPrompt: string | undefined;

async function getSystemPrompt(): Promise<string> {
  if (cachedSystemPrompt) return cachedSystemPrompt;
  cachedSystemPrompt = await readFile(join(AGENT_DIR, "system-prompt.md"), "utf-8");
  return cachedSystemPrompt;
}

export type AgentBrand = {
  name: string;
  voice: string;
  description: string;
};

export type AgentTone = "warm" | "dry" | "bold";

export type AgentInput = {
  brand: AgentBrand;
  brief: string;
  channel: Channel;
  tone: AgentTone;
  apiKey: string;
  traceContext?: TraceContext;
};

export type AgentResult = {
  text: string;
  modelUsed: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  latencyMs: number;
};

export class AgentError extends Error {
  constructor(
    public code: "GEN_FAILED" | "GEN_REFUSED" | "GEN_BAD_INPUT",
    message: string,
    public retryable: boolean,
  ) {
    super(message);
    this.name = code;
  }
}

function renderBrandVoice(brand: AgentBrand): string {
  // brand.voice is the primary signal; description gives the agent
  // additional context about what the brand actually does.
  return brand.voice
    ? `${brand.voice}\n\nWhat the brand does: ${brand.description}`
    : brand.description;
}

export async function invoke(input: AgentInput): Promise<AgentResult> {
  const template = await getSystemPrompt();
  const systemContent = template
    .replace("{{brand_voice}}", renderBrandVoice(input.brand))
    .replace("{{channel_rules}}", renderChannelRules(input.channel))
    .replace("{{tone}}", input.tone);

  const messages: ChatMessage[] = [
    { role: "system", content: systemContent },
    { role: "user", content: input.brief },
  ];

  try {
    const result = await chatComplete({
      apiKey: input.apiKey,
      modelChain: [...modelChainsByMedia.text],
      messages,
      traceContext: input.traceContext,
    });

    if (result.refused) {
      throw new AgentError("GEN_REFUSED", "Model declined the request", false);
    }

    return {
      text: result.content,
      modelUsed: result.modelUsed,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      costUsd: result.costUsd,
      latencyMs: result.latencyMs,
    };
  } catch (err) {
    if (err instanceof AgentError) throw err;
    if (err instanceof OpenRouterError) {
      if (err.code === "OPENROUTER_BAD_REQUEST") {
        throw new AgentError("GEN_BAD_INPUT", err.message, false);
      }
      if (err.code === "OPENROUTER_CHAIN_EXHAUSTED") {
        throw new AgentError("GEN_FAILED", err.message, true);
      }
    }
    throw err;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run agents/post-writer/index.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add agents/post-writer/index.ts agents/post-writer/index.test.ts
git commit -m "feat(agents/post-writer): implement invoke with prompt substitution and error mapping"
```

---

## Task 12: Convex schema additions

**Files:**
- Create: `features/agents/schema.ts`
- Modify: `features/post-generator/schema.ts`
- Modify: `convex/schema.ts`

> Skip TDD: schemas are pure data declarations. They're exercised indirectly by every Convex test in Tasks 13-15.

- [ ] **Step 1: Create `features/agents/schema.ts`**

```ts
// features/agents/schema.ts
// Cross-cutting observability for all agents (post-writer, future image/video agents).
// One row per model call; both successful and failed.
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const agentsSchema = {
  agent_runs: defineTable({
    agentId: v.string(),              // "post-writer"
    brandId: v.id("brand_profiles"),
    userId: v.id("users"),
    input: v.string(),                // user brief
    mediaType: v.union(v.literal("text"), v.literal("image"), v.literal("video")),
    modelUsed: v.string(),            // internal; stripped from public queries
    providerUsed: v.string(),         // "openrouter"
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
    .index("by_user", ["userId", "createdAt"]),
} as const;
```

- [ ] **Step 2: Modify `features/post-generator/schema.ts`**

Replace the empty stub:

```ts
// features/post-generator/schema.ts
// postgen_drafts is the artifact users see and edit. Engineering telemetry
// (which model wrote it, cost) lives on agent_runs via agentRunId.
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const postGeneratorSchema = {
  postgen_drafts: defineTable({
    brandId: v.id("brand_profiles"),
    userId: v.id("users"),
    brief: v.string(),
    mediaType: v.union(v.literal("text"), v.literal("image"), v.literal("video")),
    channel: v.string(),              // "x" | "li" | "ig" | ...
    tone: v.string(),                 // "warm" | "dry" | "bold"
    text: v.optional(v.string()),     // populated for text drafts
    imageKey: v.optional(v.string()), // R2 object key, later slice
    videoKey: v.optional(v.string()), // R2 object key, later slice
    status: v.union(
      v.literal("generated"),
      v.literal("edited"),
      v.literal("scheduled"),
      v.literal("published"),
      v.literal("discarded"),
    ),
    agentRunId: v.id("agent_runs"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_brand", ["brandId", "createdAt"])
    .index("by_brand_status", ["brandId", "status"]),
} as const;
```

- [ ] **Step 3: Modify `convex/schema.ts`**

Add an import for `agentsSchema` and spread it. After change:

```ts
// convex/schema.ts
import { agentsSchema } from "@/features/agents/schema";
import { analyticsSchema } from "@/features/analytics/schema";
import { brandProfileSchema } from "@/features/brand-profile/schema";
import { calendarSchema } from "@/features/calendar/schema";
import { dashboardSchema } from "@/features/dashboard/schema";
import { landingSchema } from "@/features/landing/schema";
import { mediaLibrarySchema } from "@/features/media-library/schema";
import { postGeneratorSchema } from "@/features/post-generator/schema";
import { defineSchema } from "convex/server";
import { sharedSchema } from "./shared/schema";

export default defineSchema({
  ...sharedSchema,
  ...landingSchema,
  ...brandProfileSchema,
  ...dashboardSchema,
  ...mediaLibrarySchema,
  ...postGeneratorSchema,
  ...calendarSchema,
  ...analyticsSchema,
  ...agentsSchema,
});
```

- [ ] **Step 4: Run typecheck + verify Convex generates types**

Run: `pnpm typecheck`
Expected: no errors.

Run: `pnpm convex codegen` (or whatever the project uses to regenerate `_generated`; if the dev server is running it regenerates automatically).
Expected: `convex/_generated/dataModel.d.ts` now includes `agent_runs` and `postgen_drafts`.

- [ ] **Step 5: Commit**

```bash
git add features/agents/schema.ts features/post-generator/schema.ts convex/schema.ts
git commit -m "feat(schema): add agent_runs and postgen_drafts tables"
```

---

## Task 13: convex/agents/runs.ts (write + queries)

**Files:**
- Create: `convex/agents/runs.ts`
- Test: `convex/agents/runs.test.ts`

- [ ] **Step 1: Look at an existing convex-test for the test pattern**

Run: `cat convex/brandProfile/brands.test.ts | head -80`
Note how `convexTest(schema)` is constructed, how a user identity is mocked, and how seed data is inserted via `t.run(ctx => ctx.db.insert(...))`. Mirror that pattern below.

- [ ] **Step 2: Write the failing tests**

```ts
// convex/agents/runs.test.ts
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "../_generated/api";
import schema from "../schema";

const SEED_USER = { name: "Test User", email: "test@omnigrowth.dev" };

async function seedUserAndBrand(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", SEED_USER);
    const brandId = await ctx.db.insert("brand_profiles", {
      userId,
      name: "Acme",
      description: "small business CRM",
      voice: "warm and direct",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { userId, brandId };
  });
}

describe("agents/runs", () => {
  it("write inserts a row with createdAt populated", async () => {
    const t = convexTest(schema);
    const { userId, brandId } = await seedUserAndBrand(t);
    const runId = await t.mutation(internal.agents.runs.write, {
      agentId: "post-writer",
      brandId,
      userId,
      input: "hi",
      mediaType: "text",
      modelUsed: "anthropic/claude-sonnet-4-6",
      providerUsed: "openrouter",
      tokensIn: 10,
      tokensOut: 20,
      costUsd: 0.001,
      latencyMs: 250,
      status: "ok",
      output: "hello",
    });
    const row = await t.run((ctx) => ctx.db.get(runId));
    expect(row?.createdAt).toBeGreaterThan(0);
    expect(row?.status).toBe("ok");
  });

  it("listByBrandPublic strips modelUsed, providerUsed, and costUsd", async () => {
    const t = convexTest(schema);
    const { userId, brandId } = await seedUserAndBrand(t);
    await t.mutation(internal.agents.runs.write, {
      agentId: "post-writer",
      brandId,
      userId,
      input: "hi",
      mediaType: "text",
      modelUsed: "anthropic/claude-sonnet-4-6",
      providerUsed: "openrouter",
      tokensIn: 10,
      tokensOut: 20,
      costUsd: 0.001,
      latencyMs: 250,
      status: "ok",
      output: "hello",
    });
    const asUser = t.withIdentity({ subject: userId, name: SEED_USER.name });
    const rows = await asUser.query(api.agents.runs.listByBrandPublic, { brandId });
    expect(rows).toHaveLength(1);
    expect(rows[0]).not.toHaveProperty("modelUsed");
    expect(rows[0]).not.toHaveProperty("providerUsed");
    expect(rows[0]).not.toHaveProperty("costUsd");
    expect(rows[0].status).toBe("ok");
  });

  it("listByBrandInternal includes modelUsed, providerUsed, and costUsd", async () => {
    const t = convexTest(schema);
    const { userId, brandId } = await seedUserAndBrand(t);
    await t.mutation(internal.agents.runs.write, {
      agentId: "post-writer",
      brandId,
      userId,
      input: "hi",
      mediaType: "text",
      modelUsed: "anthropic/claude-sonnet-4-6",
      providerUsed: "openrouter",
      tokensIn: 10,
      tokensOut: 20,
      costUsd: 0.001,
      latencyMs: 250,
      status: "ok",
      output: "hello",
    });
    const rows = await t.query(internal.agents.runs.listByBrandInternal, { brandId });
    expect(rows[0].modelUsed).toBe("anthropic/claude-sonnet-4-6");
    expect(rows[0].providerUsed).toBe("openrouter");
    expect(rows[0].costUsd).toBe(0.001);
  });

  it("listByBrandPublic requires auth and rejects unauthenticated callers", async () => {
    const t = convexTest(schema);
    const { brandId } = await seedUserAndBrand(t);
    await expect(t.query(api.agents.runs.listByBrandPublic, { brandId })).rejects.toThrow(
      /UNAUTHENTICATED/,
    );
  });

  it("listByBrandPublic rejects callers who don't own the brand", async () => {
    const t = convexTest(schema);
    const { brandId } = await seedUserAndBrand(t);
    const otherUserId = await t.run((ctx) =>
      ctx.db.insert("users", { name: "Other", email: "other@omnigrowth.dev" }),
    );
    const asOther = t.withIdentity({ subject: otherUserId, name: "Other" });
    await expect(
      asOther.query(api.agents.runs.listByBrandPublic, { brandId }),
    ).rejects.toThrow(/NOT_FOUND/);
  });
});
```

> If `convex/brandProfile/brands.test.ts` uses a different identity-setup pattern (e.g. `t.withIdentity` takes a different shape, or auth is keyed on email not subject), update the seed helper above to match. The asserted behavior stays the same.

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm vitest run convex/agents/runs.test.ts`
Expected: FAIL with "Cannot find module" or missing `api.agents.runs.*`.

- [ ] **Step 4: Implement**

```ts
// convex/agents/runs.ts
import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery, query } from "../_generated/server";

const runFields = {
  agentId: v.string(),
  brandId: v.id("brand_profiles"),
  userId: v.id("users"),
  input: v.string(),
  mediaType: v.union(v.literal("text"), v.literal("image"), v.literal("video")),
  modelUsed: v.string(),
  providerUsed: v.string(),
  tokensIn: v.number(),
  tokensOut: v.number(),
  costUsd: v.number(),
  latencyMs: v.number(),
  status: v.union(v.literal("ok"), v.literal("failed"), v.literal("refused")),
  output: v.optional(v.string()),
  error: v.optional(v.string()),
};

export const write = internalMutation({
  args: runFields,
  returns: v.id("agent_runs"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("agent_runs", { ...args, createdAt: Date.now() });
  },
});

async function ensureBrandOwner(
  ctx: { auth: { getUserIdentity: () => Promise<unknown> }; db: { get: (id: unknown) => Promise<unknown> } },
  brandId: unknown,
) {
  const userId = await getAuthUserId(ctx as never);
  if (!userId) throw new ConvexError({ code: "UNAUTHENTICATED" });
  const brand = (await ctx.db.get(brandId as never)) as { userId: unknown } | null;
  if (!brand || brand.userId !== userId) throw new ConvexError({ code: "NOT_FOUND" });
  return userId;
}

export const listByBrandPublic = query({
  args: { brandId: v.id("brand_profiles"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await ensureBrandOwner(ctx, args.brandId);
    const rows = await ctx.db
      .query("agent_runs")
      .withIndex("by_brand", (q) => q.eq("brandId", args.brandId))
      .order("desc")
      .take(args.limit ?? 50);
    return rows.map((r) => ({
      _id: r._id,
      _creationTime: r._creationTime,
      agentId: r.agentId,
      brandId: r.brandId,
      userId: r.userId,
      input: r.input,
      mediaType: r.mediaType,
      tokensIn: r.tokensIn,
      tokensOut: r.tokensOut,
      latencyMs: r.latencyMs,
      status: r.status,
      output: r.output,
      error: r.error,
      createdAt: r.createdAt,
    }));
  },
});

export const listByBrandInternal = internalQuery({
  args: { brandId: v.id("brand_profiles"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agent_runs")
      .withIndex("by_brand", (q) => q.eq("brandId", args.brandId))
      .order("desc")
      .take(args.limit ?? 50);
  },
});
```

> If the project's auth pattern is `await ctx.auth.getUserIdentity()` returning `{ tokenIdentifier, subject }` rather than `getAuthUserId`, adapt `ensureBrandOwner` to match. Look at `convex/brandProfile/brands.ts` for the canonical pattern; copy it.

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest run convex/agents/runs.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 6: Commit**

```bash
git add convex/agents/runs.ts convex/agents/runs.test.ts
git commit -m "feat(convex/agents): add runs write + listByBrand queries"
```

---

## Task 14: convex/postGenerator/drafts.ts (atomic-insert mutations)

**Files:**
- Create: `convex/postGenerator/drafts.ts` (partial — mutations only here; the action lands in Task 15)
- Test: `convex/postGenerator/drafts.test.ts` (mutations portion)

- [ ] **Step 1: Write the failing tests for the mutations**

```ts
// convex/postGenerator/drafts.test.ts
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { internal } from "../_generated/api";
import schema from "../schema";

const SEED_USER = { name: "Test User", email: "test@omnigrowth.dev" };

async function seedUserAndBrand(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", SEED_USER);
    const brandId = await ctx.db.insert("brand_profiles", {
      userId,
      name: "Acme",
      description: "small business CRM",
      voice: "warm and direct",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { userId, brandId };
  });
}

const runFields = (userId: string, brandId: string) => ({
  agentId: "post-writer",
  brandId,
  userId,
  input: "hi",
  mediaType: "text" as const,
  modelUsed: "anthropic/claude-sonnet-4-6",
  providerUsed: "openrouter",
  tokensIn: 10,
  tokensOut: 20,
  costUsd: 0.001,
  latencyMs: 250,
  status: "ok" as const,
  output: "hello",
});

const draftFields = (userId: string, brandId: string) => ({
  brandId,
  userId,
  brief: "hi",
  mediaType: "text" as const,
  channel: "x",
  tone: "warm",
  text: "hello",
  status: "generated" as const,
});

describe("postGenerator/drafts mutations", () => {
  it("persistRunAndDraft inserts both rows and links them via agentRunId", async () => {
    const t = convexTest(schema);
    const { userId, brandId } = await seedUserAndBrand(t);
    const { runId, draftId } = await t.mutation(
      internal.postGenerator.drafts.persistRunAndDraft,
      {
        runFields: runFields(userId, brandId),
        draftFields: draftFields(userId, brandId),
      },
    );
    const run = await t.run((ctx) => ctx.db.get(runId));
    const draft = await t.run((ctx) => ctx.db.get(draftId));
    expect(run?.status).toBe("ok");
    expect(draft?.text).toBe("hello");
    expect(draft?.agentRunId).toBe(runId);
    expect(draft?.createdAt).toBeGreaterThan(0);
    expect(draft?.updatedAt).toBeGreaterThan(0);
  });

  it("persistRunOnly inserts the run with failed status and no draft", async () => {
    const t = convexTest(schema);
    const { userId, brandId } = await seedUserAndBrand(t);
    const runId = await t.mutation(internal.postGenerator.drafts.persistRunOnly, {
      runFields: {
        ...runFields(userId, brandId),
        status: "failed",
        output: undefined,
        error: "boom",
      },
    });
    const run = await t.run((ctx) => ctx.db.get(runId));
    expect(run?.status).toBe("failed");
    expect(run?.error).toBe("boom");

    const drafts = await t.run((ctx) =>
      ctx.db
        .query("postgen_drafts")
        .withIndex("by_brand", (q) => q.eq("brandId", brandId))
        .collect(),
    );
    expect(drafts).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run convex/postGenerator/drafts.test.ts`
Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Implement the mutations** (action stays for Task 15)

```ts
// convex/postGenerator/drafts.ts
import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

const runFieldsValidator = v.object({
  agentId: v.string(),
  brandId: v.id("brand_profiles"),
  userId: v.id("users"),
  input: v.string(),
  mediaType: v.union(v.literal("text"), v.literal("image"), v.literal("video")),
  modelUsed: v.string(),
  providerUsed: v.string(),
  tokensIn: v.number(),
  tokensOut: v.number(),
  costUsd: v.number(),
  latencyMs: v.number(),
  status: v.union(v.literal("ok"), v.literal("failed"), v.literal("refused")),
  output: v.optional(v.string()),
  error: v.optional(v.string()),
});

const draftFieldsValidator = v.object({
  brandId: v.id("brand_profiles"),
  userId: v.id("users"),
  brief: v.string(),
  mediaType: v.union(v.literal("text"), v.literal("image"), v.literal("video")),
  channel: v.string(),
  tone: v.string(),
  text: v.optional(v.string()),
  imageKey: v.optional(v.string()),
  videoKey: v.optional(v.string()),
  status: v.union(
    v.literal("generated"),
    v.literal("edited"),
    v.literal("scheduled"),
    v.literal("published"),
    v.literal("discarded"),
  ),
});

export const persistRunAndDraft = internalMutation({
  args: {
    runFields: runFieldsValidator,
    draftFields: draftFieldsValidator,
  },
  returns: v.object({
    runId: v.id("agent_runs"),
    draftId: v.id("postgen_drafts"),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const runId = await ctx.db.insert("agent_runs", { ...args.runFields, createdAt: now });
    const draftId = await ctx.db.insert("postgen_drafts", {
      ...args.draftFields,
      agentRunId: runId,
      createdAt: now,
      updatedAt: now,
    });
    return { runId, draftId };
  },
});

export const persistRunOnly = internalMutation({
  args: { runFields: runFieldsValidator },
  returns: v.id("agent_runs"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("agent_runs", {
      ...args.runFields,
      createdAt: Date.now(),
    });
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run convex/postGenerator/drafts.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add convex/postGenerator/drafts.ts convex/postGenerator/drafts.test.ts
git commit -m "feat(convex/postGenerator): add atomic persistRunAndDraft and persistRunOnly mutations"
```

---

## Task 15: convex/postGenerator/drafts.ts (generate action)

**Files:**
- Modify: `convex/postGenerator/drafts.ts` (add the action)
- Modify: `convex/postGenerator/drafts.test.ts` (add action tests)

- [ ] **Step 1: Check `convex-test` action-mocking pattern**

Action tests usually `vi.mock` the external module (the agent) to control behavior without hitting the network. Look at any existing action test for reference, e.g. `cat convex/mediaLibrary/assets.test.ts | head -80` (if it has actions).

- [ ] **Step 2: Append the failing tests for the action**

```ts
// append to convex/postGenerator/drafts.test.ts

import { api } from "../_generated/api";
import { afterEach, beforeEach, vi } from "vitest";

const invokeMock = vi.fn();

vi.mock("../../agents/post-writer", () => ({
  invoke: invokeMock,
  AgentError: class AgentError extends Error {
    constructor(public code: string, message: string, public retryable: boolean) {
      super(message);
      this.name = code;
    }
  },
}));

beforeEach(() => {
  process.env.OPENROUTER_API_KEY = "test-key";
  invokeMock.mockReset();
});

afterEach(() => {
  delete process.env.OPENROUTER_API_KEY;
});

describe("postGenerator/drafts generate action", () => {
  it("happy path inserts draft + run, returns draftId", async () => {
    const t = convexTest(schema);
    const { userId, brandId } = await seedUserAndBrand(t);
    invokeMock.mockResolvedValueOnce({
      text: "hello world",
      modelUsed: "anthropic/claude-sonnet-4-6",
      tokensIn: 10,
      tokensOut: 20,
      costUsd: 0.001,
      latencyMs: 250,
    });
    const asUser = t.withIdentity({ subject: userId, name: SEED_USER.name });
    const result = await asUser.action(api.postGenerator.drafts.generate, {
      brandId,
      brief: "Announce launch",
      channel: "x",
      tone: "warm",
    });
    expect(result.draftId).toBeDefined();
    const draft = await t.run((ctx) => ctx.db.get(result.draftId));
    expect(draft?.text).toBe("hello world");
  });

  it("unauthenticated caller is rejected", async () => {
    const t = convexTest(schema);
    const { brandId } = await seedUserAndBrand(t);
    await expect(
      t.action(api.postGenerator.drafts.generate, {
        brandId,
        brief: "x",
        channel: "x",
        tone: "warm",
      }),
    ).rejects.toThrow(/UNAUTHENTICATED/);
  });

  it("wrong-brand caller is rejected (NOT_FOUND)", async () => {
    const t = convexTest(schema);
    const { brandId } = await seedUserAndBrand(t);
    const otherUserId = await t.run((ctx) =>
      ctx.db.insert("users", { name: "Other", email: "other@omnigrowth.dev" }),
    );
    const asOther = t.withIdentity({ subject: otherUserId, name: "Other" });
    await expect(
      asOther.action(api.postGenerator.drafts.generate, {
        brandId,
        brief: "x",
        channel: "x",
        tone: "warm",
      }),
    ).rejects.toThrow(/NOT_FOUND/);
  });

  it("invalid channel code is rejected", async () => {
    const t = convexTest(schema);
    const { userId, brandId } = await seedUserAndBrand(t);
    const asUser = t.withIdentity({ subject: userId, name: SEED_USER.name });
    await expect(
      asUser.action(api.postGenerator.drafts.generate, {
        brandId,
        brief: "x",
        channel: "not-a-channel",
        tone: "warm",
      }),
    ).rejects.toThrow(/INVALID_CHANNEL/);
  });

  it("on AgentError records run with failed status and no draft, propagates the code", async () => {
    const t = convexTest(schema);
    const { userId, brandId } = await seedUserAndBrand(t);
    const { AgentError } = await import("../../agents/post-writer");
    invokeMock.mockRejectedValueOnce(new AgentError("GEN_FAILED", "boom", true));
    const asUser = t.withIdentity({ subject: userId, name: SEED_USER.name });
    await expect(
      asUser.action(api.postGenerator.drafts.generate, {
        brandId,
        brief: "x",
        channel: "x",
        tone: "warm",
      }),
    ).rejects.toThrow(/GEN_FAILED/);
    const runs = await t.run((ctx) =>
      ctx.db
        .query("agent_runs")
        .withIndex("by_brand", (q) => q.eq("brandId", brandId))
        .collect(),
    );
    expect(runs).toHaveLength(1);
    expect(runs[0].status).toBe("failed");
    const drafts = await t.run((ctx) =>
      ctx.db
        .query("postgen_drafts")
        .withIndex("by_brand", (q) => q.eq("brandId", brandId))
        .collect(),
    );
    expect(drafts).toHaveLength(0);
  });

  it("on GEN_REFUSED records run with refused status and no draft", async () => {
    const t = convexTest(schema);
    const { userId, brandId } = await seedUserAndBrand(t);
    const { AgentError } = await import("../../agents/post-writer");
    invokeMock.mockRejectedValueOnce(new AgentError("GEN_REFUSED", "refused", false));
    const asUser = t.withIdentity({ subject: userId, name: SEED_USER.name });
    await expect(
      asUser.action(api.postGenerator.drafts.generate, {
        brandId,
        brief: "x",
        channel: "x",
        tone: "warm",
      }),
    ).rejects.toThrow(/GEN_REFUSED/);
    const runs = await t.run((ctx) =>
      ctx.db
        .query("agent_runs")
        .withIndex("by_brand", (q) => q.eq("brandId", brandId))
        .collect(),
    );
    expect(runs[0].status).toBe("refused");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm vitest run convex/postGenerator/drafts.test.ts`
Expected: FAIL (action not exported yet).

- [ ] **Step 4: Append the action to `convex/postGenerator/drafts.ts`**

```ts
// append to convex/postGenerator/drafts.ts
import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { AgentError, invoke as invokePostWriter } from "../../agents/post-writer";
import { isChannel } from "../../agents/post-writer/channels";

export const generate = action({
  args: {
    brandId: v.id("brand_profiles"),
    brief: v.string(),
    channel: v.string(),
    tone: v.string(),
  },
  returns: v.object({ draftId: v.id("postgen_drafts") }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError({ code: "UNAUTHENTICATED" });

    if (!isChannel(args.channel)) {
      throw new ConvexError({ code: "INVALID_CHANNEL", channel: args.channel });
    }
    if (args.tone !== "warm" && args.tone !== "dry" && args.tone !== "bold") {
      throw new ConvexError({ code: "INVALID_TONE", tone: args.tone });
    }

    const brand = await ctx.runQuery(internal.brandProfile.brands.getById, {
      brandId: args.brandId,
    });
    if (!brand || brand.userId !== userId) {
      throw new ConvexError({ code: "NOT_FOUND" });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new ConvexError({ code: "MISSING_API_KEY" });

    const runFieldsBase = {
      agentId: "post-writer",
      brandId: args.brandId,
      userId,
      input: args.brief,
      mediaType: "text" as const,
      providerUsed: "openrouter",
    };

    try {
      const result = await invokePostWriter({
        brand: { name: brand.name, voice: brand.voice, description: brand.description },
        brief: args.brief,
        channel: args.channel,
        tone: args.tone,
        apiKey,
        traceContext: { agentId: "post-writer", brandId: args.brandId, userId },
      });

      const { draftId } = await ctx.runMutation(
        internal.postGenerator.drafts.persistRunAndDraft,
        {
          runFields: {
            ...runFieldsBase,
            modelUsed: result.modelUsed,
            tokensIn: result.tokensIn,
            tokensOut: result.tokensOut,
            costUsd: result.costUsd,
            latencyMs: result.latencyMs,
            status: "ok",
            output: result.text,
          },
          draftFields: {
            brandId: args.brandId,
            userId,
            brief: args.brief,
            mediaType: "text",
            channel: args.channel,
            tone: args.tone,
            text: result.text,
            status: "generated",
          },
        },
      );

      return { draftId };
    } catch (err) {
      if (err instanceof AgentError) {
        await ctx.runMutation(internal.postGenerator.drafts.persistRunOnly, {
          runFields: {
            ...runFieldsBase,
            modelUsed: "",
            tokensIn: 0,
            tokensOut: 0,
            costUsd: 0,
            latencyMs: 0,
            status: err.code === "GEN_REFUSED" ? "refused" : "failed",
            error: err.message,
          },
        });
        throw new ConvexError({ code: err.code, retryable: err.retryable });
      }
      throw err;
    }
  },
});
```

> The action references `internal.brandProfile.brands.getById`. If that internal query doesn't exist yet (check via `cat convex/brandProfile/brands.ts | grep getById`), add a small `internalQuery` to `convex/brandProfile/brands.ts` that returns `ctx.db.get(args.brandId)` (no auth check — the caller owns auth). Commit that separately first.

- [ ] **Step 5: If `internal.brandProfile.brands.getById` doesn't exist, add it**

Add to `convex/brandProfile/brands.ts`:

```ts
export const getById = internalQuery({
  args: { brandId: v.id("brand_profiles") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.brandId);
  },
});
```

Commit separately if added:

```bash
git add convex/brandProfile/brands.ts
git commit -m "feat(convex/brandProfile): expose internal getById for cross-feature lookups"
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm vitest run convex/postGenerator/drafts.test.ts`
Expected: PASS (all tests from Task 14 + 6 new action tests = 8 total).

- [ ] **Step 7: Run full test + typecheck**

Run: `pnpm typecheck && pnpm test`
Expected: typecheck clean; all tests pass.

- [ ] **Step 8: Commit**

```bash
git add convex/postGenerator/drafts.ts convex/postGenerator/drafts.test.ts
git commit -m "feat(convex/postGenerator): add generate action wired to post-writer agent"
```

---

## Task 16: Wire UI at /dash/b/[brandId]/generate

**Files:**
- Modify: `app/(app)/dash/b/[brandId]/generate/page.tsx`
- Create: `features/post-generator/components/GeneratorForm.tsx`

> UI is not pixel-perfect this slice (per spec). Wire the action, surface the result, surface errors. The designer's bundle replaces this when it lands. Playwright/manual is the test discipline per memory `feedback_tdd_discipline`.

- [ ] **Step 1: Create the client form component**

```tsx
// features/post-generator/components/GeneratorForm.tsx
"use client";

import { useAction } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const CHANNELS: { code: string; label: string }[] = [
  { code: "x", label: "X (Twitter)" },
  { code: "li", label: "LinkedIn" },
  { code: "ig", label: "Instagram" },
  { code: "fb", label: "Facebook" },
  { code: "tt", label: "TikTok" },
  { code: "yt", label: "YouTube" },
  { code: "th", label: "Threads" },
  { code: "pi", label: "Pinterest" },
];

const TONES = ["warm", "dry", "bold"] as const;

export function GeneratorForm({ brandId }: { brandId: Id<"brand_profiles"> }) {
  const generate = useAction(api.postGenerator.drafts.generate);
  const [brief, setBrief] = useState("");
  const [channel, setChannel] = useState("x");
  const [tone, setTone] = useState<(typeof TONES)[number]>("warm");
  const [pending, setPending] = useState(false);
  const [draftText, setDraftText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setDraftText(null);
    try {
      const result = await generate({ brandId, brief, channel, tone });
      // The action returns just the id; for v1 we fetch the draft via a follow-up
      // query call. For now, show the brief echoed back and the draft id.
      // The dedicated list/get queries land in a follow-up; this is enough to
      // confirm the action wired up correctly.
      setDraftText(`Draft created: ${result.draftId}`);
    } catch (err) {
      const code = (err as { data?: { code?: string } })?.data?.code ?? String(err);
      setError(code);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card-pad" style={{ display: "grid", gap: 16 }}>
      <label>
        Brief
        <textarea
          required
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          rows={4}
          placeholder="One or two sentences describing what to post about"
        />
      </label>
      <label>
        Channel
        <select value={channel} onChange={(e) => setChannel(e.target.value)}>
          {CHANNELS.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Tone
        <select value={tone} onChange={(e) => setTone(e.target.value as (typeof TONES)[number])}>
          {TONES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={pending || brief.length === 0} className="btn btn-primary">
        {pending ? "Generating..." : "Generate"}
      </button>
      {error && <p style={{ color: "var(--danger, #b00)" }}>Error: {error}</p>}
      {draftText && <pre style={{ whiteSpace: "pre-wrap" }}>{draftText}</pre>}
    </form>
  );
}
```

- [ ] **Step 2: Replace the page stub**

```tsx
// app/(app)/dash/b/[brandId]/generate/page.tsx
import { GeneratorForm } from "@/features/post-generator/components/GeneratorForm";
import type { Id } from "@/convex/_generated/dataModel";

export default async function GeneratePage({
  params,
}: {
  params: Promise<{ brandId: string }>;
}) {
  const { brandId } = await params;

  return (
    <>
      <div className="app-page-head">
        <div>
          <h1>AI Post Generator</h1>
          <p className="caption">Text drafts. One channel at a time. Image and video land next.</p>
        </div>
      </div>

      <section className="mt-24" style={{ maxWidth: 720 }}>
        <GeneratorForm brandId={brandId as Id<"brand_profiles">} />
      </section>
    </>
  );
}
```

- [ ] **Step 3: Manual smoke test**

Run: `pnpm dev` (in a separate terminal). Then:
1. Sign in to a brand at `/dash/b/<brandId>/generate`.
2. Enter a brief, pick channel + tone, submit.
3. Confirm a draft id appears, no console errors.
4. Open Convex dashboard or run a quick query and confirm `agent_runs` + `postgen_drafts` rows exist for your brand.
5. (Optional) If you set `LANGFUSE_PUBLIC_KEY` + `LANGFUSE_SECRET_KEY` in `.env.local`, confirm a trace appears in Langfuse Cloud.

- [ ] **Step 4: Run typecheck + tests one more time**

Run: `pnpm typecheck && pnpm test && pnpm lint`
Expected: all clean.

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/dash/b/\[brandId\]/generate/page.tsx features/post-generator/components/GeneratorForm.tsx
git commit -m "feat(post-generator): wire generate page to the post-writer action"
```

---

## Done criteria

- All Vitest tests pass (`pnpm test`).
- `pnpm typecheck` is clean.
- `pnpm lint` is clean.
- Manual smoke test at `/dash/b/<brandId>/generate` produces a draft + writes both `agent_runs` and `postgen_drafts` rows.
- (Optional, manual) `OPENROUTER_LIVE_TEST=1 pnpm vitest run lib/openrouter/live.test.ts` passes.
- (Optional, manual) Langfuse trace visible when LANGFUSE keys are set.

## Follow-ups (separate plans)

- Eval rig: `runEvalSuite(agentId, datasetId)` + LLM-as-judge + 10-brief seed dataset.
- OmniBits pricing + debit (deferred per spec; revisit after eval signal).
- Pixel-perfect generator UI from the designer's bundle (replace `GeneratorForm`).
- Image slice (`lib/together` + `lib/wavespeed`).
- Video slice.
