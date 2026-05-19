import { describe, expect, it } from "vitest";
import { type AssetKind, type AssetScope, buildKey, normaliseExt, parseKey } from "./keys";

describe("buildKey", () => {
  it("builds a brand-scoped uploads key", () => {
    expect(
      buildKey({
        env: "dev",
        scope: { kind: "brand", brandId: "k57x123abc" },
        assetKind: "uploads",
        id: "asset-3jq8xyz",
        ext: "mp4",
      }),
    ).toBe("dev/brand-k57x123abc/uploads/asset-3jq8xyz.mp4");
  });

  it("builds a global premade key", () => {
    expect(
      buildKey({
        env: "prod",
        scope: { kind: "global" },
        assetKind: "premade",
        id: "clip-veh-sedan-01",
        ext: "mp4",
      }),
    ).toBe("prod/global/premade/clip-veh-sedan-01.mp4");
  });

  it("lowercases the extension", () => {
    const key = buildKey({
      env: "dev",
      scope: { kind: "brand", brandId: "k57x" },
      assetKind: "uploads",
      id: "x",
      ext: "MP4",
    });
    expect(key.endsWith(".mp4")).toBe(true);
  });

  it("rejects an extension containing path characters", () => {
    expect(() =>
      buildKey({
        env: "dev",
        scope: { kind: "brand", brandId: "k57x" },
        assetKind: "uploads",
        id: "x",
        ext: "../etc/passwd",
      }),
    ).toThrow(/invalid extension/i);
  });

  it("rejects an id containing path separators", () => {
    expect(() =>
      buildKey({
        env: "dev",
        scope: { kind: "brand", brandId: "k57x" },
        assetKind: "uploads",
        id: "x/y",
        ext: "mp4",
      }),
    ).toThrow(/invalid id/i);
  });
});

describe("parseKey", () => {
  it("round-trips a brand-scoped key", () => {
    const original = "dev/brand-k57x123abc/uploads/asset-3jq8xyz.mp4";
    expect(parseKey(original)).toEqual({
      env: "dev",
      scope: { kind: "brand", brandId: "k57x123abc" },
      assetKind: "uploads",
      id: "asset-3jq8xyz",
      ext: "mp4",
    });
  });

  it("round-trips a global premade key", () => {
    const original = "prod/global/premade/clip-veh-sedan-01.mp4";
    expect(parseKey(original)).toEqual({
      env: "prod",
      scope: { kind: "global" },
      assetKind: "premade",
      id: "clip-veh-sedan-01",
      ext: "mp4",
    });
  });

  it("returns null for malformed input", () => {
    expect(parseKey("garbage")).toBeNull();
    expect(parseKey("dev/brand-k57x/uploads/no-extension")).toBeNull();
    expect(parseKey("nope/brand-k57x/uploads/x.mp4")).toBeNull();
  });
});

describe("normaliseExt", () => {
  it("strips a leading dot", () => {
    expect(normaliseExt(".MP4")).toBe("mp4");
  });

  it("lowercases", () => {
    expect(normaliseExt("PNG")).toBe("png");
  });

  it("returns null for empty", () => {
    expect(normaliseExt("")).toBeNull();
    expect(normaliseExt(".")).toBeNull();
  });
});

// Type-level assertions (compile-time only)
const _kinds: AssetKind[] = ["uploads", "premade", "ai-images", "renders", "brand-assets"];
const _scopes: AssetScope[] = [{ kind: "global" }, { kind: "brand", brandId: "x" }];
