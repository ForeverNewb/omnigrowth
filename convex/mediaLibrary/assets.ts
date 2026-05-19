// Media-library queries and mutations. V8 runtime — no R2 imports here.
// Anything that needs to talk to R2 lives in convex/mediaLibrary/presign.ts
// (Node runtime, "use node";).
//
// Brand ownership is verified in every public function. Probe-by-id reads
// (get) return null on missing/unowned/unauthenticated to avoid existence
// leaks; mutations and list throw ConvexError NOT_FOUND for the same
// conditions, matching the convention set by convex/brandProfile/brands.ts.

import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { inferKindFromMime, mimeForExt } from "../../lib/r2/mime";
import { expiresAtFor } from "../../lib/r2/retention";
import type { Doc, Id } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";

async function loadOwnedBrand(
  ctx: { db: { get: (id: Id<"brand_profiles">) => Promise<Doc<"brand_profiles"> | null> } },
  userId: Id<"users">,
  brandId: Id<"brand_profiles">,
): Promise<Doc<"brand_profiles">> {
  const brand = await ctx.db.get(brandId);
  if (brand === null || brand.userId !== userId) {
    throw new ConvexError({ code: "NOT_FOUND" });
  }
  return brand;
}

export const list = query({
  args: { brandId: v.id("brand_profiles") },
  handler: async (ctx, { brandId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError({ code: "UNAUTHENTICATED" });
    }
    await loadOwnedBrand(ctx, userId, brandId);
    return await ctx.db
      .query("media_assets")
      .withIndex("by_brand_created", (q) => q.eq("brandId", brandId))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { assetId: v.id("media_assets") },
  handler: async (ctx, { assetId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const asset = await ctx.db.get(assetId);
    if (asset === null) return null;
    if (asset.brandId === null) return null; // global premade — not exposed via get
    const brand = await ctx.db.get(asset.brandId);
    if (brand === null || brand.userId !== userId) return null;
    return asset;
  },
});

export const recordUpload = mutation({
  args: {
    brandId: v.id("brand_profiles"),
    key: v.string(),
    contentType: v.string(),
    sizeBytes: v.number(),
    originalFilename: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError({ code: "UNAUTHENTICATED" });
    }
    const user = await ctx.db.get(userId);
    if (user === null) {
      throw new ConvexError({ code: "INTERNAL", reason: "user_row_missing" });
    }
    await loadOwnedBrand(ctx, userId, args.brandId);

    const kind = inferKindFromMime(args.contentType);
    if (kind === null) {
      throw new ConvexError({ code: "INVALID_CONTENT_TYPE" });
    }

    const now = Date.now();
    return await ctx.db.insert("media_assets", {
      brandId: args.brandId,
      key: args.key,
      source: "uploads",
      kind,
      contentType: args.contentType,
      sizeBytes: args.sizeBytes,
      originalFilename: args.originalFilename,
      // No `as Tier` cast: schema's tier union matches Tier exactly. If a
      // tier is added to the schema but not to UPLOAD_RETENTION_DAYS_BY_TIER,
      // we want TypeScript to catch it here.
      expiresAt: expiresAtFor("uploads", user.tier, now),
      createdAt: now,
    });
  },
});

export const remove = mutation({
  args: { assetId: v.id("media_assets") },
  handler: async (ctx, { assetId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError({ code: "UNAUTHENTICATED" });
    }
    const asset = await ctx.db.get(assetId);
    if (asset === null) {
      throw new ConvexError({ code: "NOT_FOUND" });
    }
    if (asset.brandId === null) {
      // Global / premade rows can only be removed by an admin script.
      throw new ConvexError({ code: "NOT_FOUND" });
    }
    await loadOwnedBrand(ctx, userId, asset.brandId);
    // Tombstone via expiresAt: 0 instead of hard delete. The cleanup cron
    // (Task 11) will reap the R2 object and the row on its next pass.
    // Follow-up: action-driven immediate purge (see Coda follow-up rows in
    // Task 17).
    await ctx.db.patch(assetId, { expiresAt: 0 });
  },
});
