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
