import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createOpenRouterClient } from "./client";
import { wrapWithLangfuse } from "./trace";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  // biome-ignore lint/performance/noDelete: must remove env vars entirely; assignment would coerce to "undefined" string.
  delete process.env.LANGFUSE_PUBLIC_KEY;
  // biome-ignore lint/performance/noDelete: must remove env vars entirely; assignment would coerce to "undefined" string.
  delete process.env.LANGFUSE_SECRET_KEY;
  // biome-ignore lint/performance/noDelete: must remove env vars entirely; assignment would coerce to "undefined" string.
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
