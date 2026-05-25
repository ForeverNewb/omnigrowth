import { describe, expect, it } from "vitest";
import { type MediaType, OPENROUTER_TEXT_CHAIN, getModelChain } from "./models";

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
