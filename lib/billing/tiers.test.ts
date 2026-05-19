import { describe, expect, it } from "vitest";
import { BRAND_LIMIT_BY_TIER, UPLOAD_RETENTION_DAYS_BY_TIER, assertBrandQuotaOk } from "./tiers";

describe("BRAND_LIMIT_BY_TIER", () => {
  it("matches the published tier table", () => {
    expect(BRAND_LIMIT_BY_TIER).toEqual({ free: 1, pro: 3, agency: 10 });
  });
});

describe("assertBrandQuotaOk", () => {
  it("passes when count is under the tier's limit", () => {
    expect(() => assertBrandQuotaOk(0, "free")).not.toThrow();
    expect(() => assertBrandQuotaOk(2, "pro")).not.toThrow();
    expect(() => assertBrandQuotaOk(9, "agency")).not.toThrow();
  });

  it("throws when count is at or above the tier's limit", () => {
    expect(() => assertBrandQuotaOk(1, "free")).toThrow(/BRAND_QUOTA_EXCEEDED/);
    expect(() => assertBrandQuotaOk(3, "pro")).toThrow(/BRAND_QUOTA_EXCEEDED/);
    expect(() => assertBrandQuotaOk(10, "agency")).toThrow(/BRAND_QUOTA_EXCEEDED/);
  });

  it("includes the limit and tier in the thrown error data", () => {
    try {
      assertBrandQuotaOk(1, "free");
      throw new Error("should have thrown");
    } catch (err) {
      // ConvexError exposes the structured payload on `.data`.
      // We accept either ConvexError or a plain Error whose message is JSON, since the
      // test runs outside the Convex runtime; the production type is ConvexError.
      const data = (err as { data?: unknown }).data;
      expect(data).toEqual({ code: "BRAND_QUOTA_EXCEEDED", limit: 1, tier: "free" });
    }
  });
});

describe("UPLOAD_RETENTION_DAYS_BY_TIER", () => {
  it("matches the published retention table", () => {
    expect(UPLOAD_RETENTION_DAYS_BY_TIER).toEqual({
      free: 7,
      pro: 90,
      agency: 365,
    });
  });
});
