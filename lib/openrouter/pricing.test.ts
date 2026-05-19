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
