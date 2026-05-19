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
  wrapWithLangfuse: <T>(c: T) => c,
}));

import { OpenRouterError, chatComplete } from "./index";

class HttpError extends Error {
  constructor(
    public status: number,
    message = `HTTP ${status}`,
  ) {
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
      choices: [
        { message: { content: "I can't help with that." }, finish_reason: "content_filter" },
      ],
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
