import { beforeEach, describe, expect, it, vi } from "vitest";

const chatCompleteMock = vi.hoisted(() => vi.fn());

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
    expect(systemMsg.content).toContain("warm");
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
