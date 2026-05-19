// media_assets is the metadata table for every binary stored in R2. The bytes
// live exclusively in R2; this table holds the object key plus enough info
// to (a) display thumbnails / list rows, (b) authorize access, and (c) drive
// the retention cleanup cron.
//
// brandId is the security boundary for user-owned content. global-scope rows
// (premade catalog) carry brandId === null; the read path never returns
// other-user assets.
//
// Indexes:
// - by_brand_created — list a brand's assets, newest first.
// - by_expires — cleanup cron scans rows whose expiresAt <= now.
// - by_key — uniqueness check + reverse lookup from R2 → Convex during
//   admin/maintenance ops.

import { defineTable } from "convex/server";
import { v } from "convex/values";

export const mediaLibrarySchema = {
  media_assets: defineTable({
    // Owner. null = global (premade catalog), seeded by admin only.
    brandId: v.union(v.id("brand_profiles"), v.null()),

    // R2 key — the canonical identifier. Built by lib/r2/keys.ts buildKey().
    key: v.string(),

    // Discriminator that matches the AssetKind type in lib/r2/keys.ts.
    source: v.union(
      v.literal("uploads"),
      v.literal("premade"),
      v.literal("ai-images"),
      v.literal("renders"),
      v.literal("brand-assets"),
    ),

    // image | video — mirrors lib/r2/mime.ts MediaKind. Drives UI (img vs
    // video tag).
    kind: v.union(v.literal("image"), v.literal("video")),

    contentType: v.string(), // e.g. "video/mp4"
    sizeBytes: v.number(),
    originalFilename: v.optional(v.string()),

    // null for never-expire (premade / ai-images / renders / brand-assets).
    expiresAt: v.union(v.number(), v.null()),

    createdAt: v.number(),
  })
    .index("by_brand_created", ["brandId", "createdAt"])
    .index("by_expires", ["expiresAt"])
    .index("by_key", ["key"]),
} as const;
