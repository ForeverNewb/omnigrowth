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
