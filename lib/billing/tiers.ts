// Tier-driven brand-profile quota. Read by convex/brandProfile/brands.ts
// at create-time, and (later) by features/settings-billing/ to display the cap.
// Why lib/billing/ and not inside features/brand-profile/: per docs/architecture.md
// rule 4, lib/ is for things consumed across feature boundaries. The brand cap is
// one of several tier dimensions; settings-billing will read this same map.

import { ConvexError } from "convex/values";

export const BRAND_LIMIT_BY_TIER = {
  free: 1,
  pro: 3,
  agency: 10,
} as const;

export type Tier = keyof typeof BRAND_LIMIT_BY_TIER;

export function assertBrandQuotaOk(currentCount: number, tier: Tier): void {
  const limit = BRAND_LIMIT_BY_TIER[tier];
  if (currentCount >= limit) {
    throw new ConvexError({
      code: "BRAND_QUOTA_EXCEEDED",
      limit,
      tier,
    });
  }
}

// Days that user-uploaded media is retained before the nightly cleanup
// purges it. premade / ai-images / renders / brand-assets are never expired
// and live with `expiresAt: null` — they don't appear in this map.
export const UPLOAD_RETENTION_DAYS_BY_TIER = {
  free: 7,
  pro: 90,
  agency: 365,
} as const satisfies Record<Tier, number>;
