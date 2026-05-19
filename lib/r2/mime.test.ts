import { describe, expect, it } from "vitest";
import { ALLOWED_EXTENSIONS, inferKindFromMime, isAllowedExt, mimeForExt } from "./mime";

describe("ALLOWED_EXTENSIONS", () => {
  it("covers the documented set", () => {
    expect(new Set(ALLOWED_EXTENSIONS)).toEqual(
      new Set(["mp4", "mov", "webm", "png", "jpg", "jpeg", "gif", "webp"]),
    );
  });
});

describe("isAllowedExt", () => {
  it("accepts allowlisted extensions case-insensitively", () => {
    expect(isAllowedExt("mp4")).toBe(true);
    expect(isAllowedExt(".MP4")).toBe(true);
    expect(isAllowedExt("PNG")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isAllowedExt("exe")).toBe(false);
    expect(isAllowedExt("")).toBe(false);
    expect(isAllowedExt("svg")).toBe(false);
  });
});

describe("mimeForExt", () => {
  it("returns the correct mime for video", () => {
    expect(mimeForExt("mp4")).toBe("video/mp4");
    expect(mimeForExt("mov")).toBe("video/quicktime");
    expect(mimeForExt("webm")).toBe("video/webm");
  });

  it("returns the correct mime for images", () => {
    expect(mimeForExt("png")).toBe("image/png");
    expect(mimeForExt("jpg")).toBe("image/jpeg");
    expect(mimeForExt("jpeg")).toBe("image/jpeg");
    expect(mimeForExt("gif")).toBe("image/gif");
    expect(mimeForExt("webp")).toBe("image/webp");
  });

  it("returns null for disallowed extensions", () => {
    expect(mimeForExt("exe")).toBeNull();
  });
});

describe("inferKindFromMime", () => {
  it("classifies images and videos", () => {
    expect(inferKindFromMime("image/png")).toBe("image");
    expect(inferKindFromMime("video/mp4")).toBe("video");
  });

  it("returns null for anything else", () => {
    expect(inferKindFromMime("application/pdf")).toBeNull();
    expect(inferKindFromMime("")).toBeNull();
  });
});
