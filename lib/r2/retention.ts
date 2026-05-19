// Tier-based retention for user uploads. Pure. The cleanup cron reads
// `expiresAt` from each row; this is where that value is computed at write
// time. premade / ai-images / renders / brand-assets always live forever.

import { type Tier, UPLOAD_RETENTION_DAYS_BY_TIER } from "../billing/tiers";
import type { AssetKind } from "./keys";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function expiresAtFor(source: AssetKind, tier: Tier, now: number): number | null {
  if (source !== "uploads") return null;
  return now + UPLOAD_RETENTION_DAYS_BY_TIER[tier] * ONE_DAY_MS;
}
