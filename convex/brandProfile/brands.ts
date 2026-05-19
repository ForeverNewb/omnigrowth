// Brand-profile CRUD. Lives under convex/ (not features/brand-profile/convex/)
// because Convex codegen and bundler scan the configured functions directory
// directly — see docs/superpowers/plans/2026-05-04-brand-profile.md "Pre-flight
// note 5". The feature ownership is logical: this file implements the
// brand-profile feature's queries/mutations.

import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { type Tier, assertBrandQuotaOk } from "../../lib/billing/tiers";
import { internalQuery, mutation, query } from "../_generated/server";

// Trim and reject empty/whitespace names. Used by both `create` and `rename`.
// Convex `v.string()` validators don't support min-length constraints, so the
// check is runtime. Returns the trimmed value so handlers persist normalized
// input.
function assertValidName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new ConvexError({ code: "INVALID_NAME" });
  }
  return trimmed;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError({ code: "UNAUTHENTICATED" });
    }
    return await ctx.db
      .query("brand_profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("asc")
      .collect();
  },
});

// Probe-by-id read: returns null for missing / unowned / unauthenticated,
// so a caller cannot distinguish "doesn't exist" from "exists but isn't
// yours". This is deliberate — see "Error handling" in
// docs/superpowers/specs/2026-05-04-brand-profile-design.md. The future
// brands.rename and brands.remove mutations THROW ConvexError NOT_FOUND on
// the same conditions; do not normalize the read path to throw without
// re-reading the spec.
export const get = query({
  args: { brandId: v.id("brand_profiles") },
  handler: async (ctx, { brandId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const brand = await ctx.db.get(brandId);
    if (brand === null) return null;
    if (brand.userId !== userId) return null;
    return brand;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    voice: v.optional(v.string()),
  },
  handler: async (ctx, { name, description, voice }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError({ code: "UNAUTHENTICATED" });
    }
    const trimmedName = assertValidName(name);
    const user = await ctx.db.get(userId);
    if (user === null) {
      // Defence in depth — the user row should always exist for an authed
      // caller. Distinct code from UNAUTHENTICATED so the client doesn't
      // bounce the user back to /login on what is actually a server-side
      // integrity violation.
      throw new ConvexError({ code: "INTERNAL", reason: "user_row_missing" });
    }
    const existing = await ctx.db
      .query("brand_profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    // No `as Tier` cast: schema's `v.union(v.literal("free"|"pro"|"agency"))`
    // produces the same union as `Tier`. If a tier is added to the schema but
    // not to BRAND_LIMIT_BY_TIER, we want TypeScript to catch it here.
    assertBrandQuotaOk(existing.length, user.tier);

    const now = Date.now();
    return await ctx.db.insert("brand_profiles", {
      userId,
      name: trimmedName,
      description: description ?? "",
      voice: voice ?? "",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const rename = mutation({
  args: { brandId: v.id("brand_profiles"), name: v.string() },
  handler: async (ctx, { brandId, name }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError({ code: "UNAUTHENTICATED" });
    }
    const trimmedName = assertValidName(name);
    const brand = await ctx.db.get(brandId);
    if (brand === null || brand.userId !== userId) {
      throw new ConvexError({ code: "NOT_FOUND" });
    }
    await ctx.db.patch(brandId, { name: trimmedName, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { brandId: v.id("brand_profiles") },
  handler: async (ctx, { brandId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError({ code: "UNAUTHENTICATED" });
    }
    const brand = await ctx.db.get(brandId);
    if (brand === null || brand.userId !== userId) {
      throw new ConvexError({ code: "NOT_FOUND" });
    }

    // CASCADE: brand-scoped tables clean up here before the brand is deleted.
    // The whole block runs in one Convex transaction.

    // media_assets — patch expiresAt to 0 (rather than ctx.db.delete) so the
    // existing cleanup cron in convex/mediaLibrary/cleanup.ts reaps both the
    // Convex row AND the R2 object on its next run. Null-brandId rows (global
    // premade catalog) are untouched because the index match is exact.
    for (const row of await ctx.db
      .query("media_assets")
      .withIndex("by_brand_created", (q) => q.eq("brandId", brandId))
      .collect()) {
      await ctx.db.patch(row._id, { expiresAt: 0 });
    }

    // (Future brand-scoped tables — calendar_events, postgen_jobs, analytics
    // records — add their own block above this line. Either patch expiresAt
    // for tables with R2 dependencies, or ctx.db.delete for pure Convex tables.)

    await ctx.db.delete(brandId);
  },
});

export const getById = internalQuery({
  args: { brandId: v.id("brand_profiles") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.brandId);
  },
});
