import { OPENROUTER_TEXT_CHAIN } from "@/lib/openrouter/models";

export const modelChainsByMedia = {
  text: OPENROUTER_TEXT_CHAIN,
} as const;

export const retryRules = {
  /** Per-model attempts handled inside lib/openrouter; agent-level retries are deferred. */
  maxAttemptsPerModel: 1,
  timeoutMs: 30_000,
} as const;
