import { describe, expect, it } from "vitest";
import { CHANNELS, type Channel, renderChannelRules } from "./channels";

describe("CHANNELS", () => {
  it("includes all 8 channel codes", () => {
    expect(Object.keys(CHANNELS).sort()).toEqual(["fb", "ig", "li", "pi", "th", "tt", "x", "yt"]);
  });

  it("Twitter/X has a 280-char limit", () => {
    expect(CHANNELS.x.charLimit).toBe(280);
  });

  it("Threads has a 500-char limit", () => {
    expect(CHANNELS.th.charLimit).toBe(500);
  });
});

describe("renderChannelRules", () => {
  it("returns text with channel name and char limit", () => {
    const out = renderChannelRules("x");
    expect(out).toContain("X (Twitter)");
    expect(out).toContain("Character limit: 280");
  });

  it("notes 'Hashtags: none' for channels that disallow hashtags", () => {
    const out = renderChannelRules("fb");
    expect(out).toContain("Hashtags: none");
  });

  it("notes hashtag max for channels that allow them", () => {
    const out = renderChannelRules("ig");
    expect(out).toMatch(/Hashtags: up to \d+/);
  });
});
