// brand_profiles is the workspace boundary: every brand-scoped feature
// (post-generator, calendar, analytics, connected-accounts) carries a
// `brandId` foreign key referencing this table. See
// docs/features/brand-profile.md and docs/superpowers/specs/2026-05-04-brand-profile-design.md.

import { defineTable } from "convex/server";
import { v } from "convex/values";

export const brandProfileSchema = {
  brand_profiles: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.string(), // free text, may be ""
    voice: v.string(), // free text, may be ""
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
} as const;
