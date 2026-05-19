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
