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
