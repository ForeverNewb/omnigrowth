import { describe, expect, it } from "vitest";
import { expiresAtFor } from "./retention";

const NOW = Date.UTC(2026, 4, 5, 12, 0, 0); // 2026-05-05 12:00:00Z
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

describe("expiresAtFor", () => {
  it("returns null for sources that never expire", () => {
    for (const source of ["premade", "ai-images", "renders", "brand-assets"] as const) {
      expect(expiresAtFor(source, "free", NOW)).toBeNull();
      expect(expiresAtFor(source, "pro", NOW)).toBeNull();
      expect(expiresAtFor(source, "agency", NOW)).toBeNull();
    }
  });

  it("computes expiry from now + tier days for uploads", () => {
    expect(expiresAtFor("uploads", "free", NOW)).toBe(NOW + 7 * ONE_DAY_MS);
    expect(expiresAtFor("uploads", "pro", NOW)).toBe(NOW + 90 * ONE_DAY_MS);
    expect(expiresAtFor("uploads", "agency", NOW)).toBe(NOW + 365 * ONE_DAY_MS);
  });
});
