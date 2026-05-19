import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery, query } from "../_generated/server";

const runFields = {
  agentId: v.string(),
  brandId: v.id("brand_profiles"),
  userId: v.id("users"),
  input: v.string(),
  mediaType: v.union(v.literal("text"), v.literal("image"), v.literal("video")),
  modelUsed: v.string(),
  providerUsed: v.string(),
  tokensIn: v.number(),
  tokensOut: v.number(),
  costUsd: v.number(),
  latencyMs: v.number(),
  status: v.union(v.literal("ok"), v.literal("failed"), v.literal("refused")),
  output: v.optional(v.string()),
  error: v.optional(v.string()),
};

export const write = internalMutation({
  args: runFields,
  returns: v.id("agent_runs"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("agent_runs", { ...args, createdAt: Date.now() });
  },
});

export const listByBrandPublic = query({
  args: { brandId: v.id("brand_profiles"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError({ code: "UNAUTHENTICATED" });
    const brand = await ctx.db.get(args.brandId);
    if (!brand || brand.userId !== userId) throw new ConvexError({ code: "NOT_FOUND" });
    const rows = await ctx.db
      .query("agent_runs")
      .withIndex("by_brand", (q) => q.eq("brandId", args.brandId))
      .order("desc")
      .take(args.limit ?? 50);
    return rows.map((r) => ({
      _id: r._id,
      _creationTime: r._creationTime,
      agentId: r.agentId,
      brandId: r.brandId,
      userId: r.userId,
      input: r.input,
      mediaType: r.mediaType,
      tokensIn: r.tokensIn,
      tokensOut: r.tokensOut,
      latencyMs: r.latencyMs,
      status: r.status,
      output: r.output,
      error: r.error,
      createdAt: r.createdAt,
    }));
  },
});

export const listByBrandInternal = internalQuery({
  args: { brandId: v.id("brand_profiles"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agent_runs")
      .withIndex("by_brand", (q) => q.eq("brandId", args.brandId))
      .order("desc")
      .take(args.limit ?? 50);
  },
});
