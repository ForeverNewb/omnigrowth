// V8 runtime helpers for the cleanup action. No R2 imports — queries and
// mutations must live in a separate file from the "use node" action file.

import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

export const _listExpired = internalQuery({
  args: { now: v.number(), limit: v.number() },
  handler: async (ctx, { now, limit }) => {
    return await ctx.db
      .query("media_assets")
      .withIndex("by_expires", (q) => q.lte("expiresAt", now))
      .take(limit);
  },
});

export const _deleteRow = internalMutation({
  args: { assetId: v.id("media_assets") },
  handler: async (ctx, { assetId }) => {
    await ctx.db.delete(assetId);
  },
});
