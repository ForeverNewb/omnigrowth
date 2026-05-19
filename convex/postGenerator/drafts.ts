import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

const runFieldsValidator = v.object({
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
});

const draftFieldsValidator = v.object({
  brandId: v.id("brand_profiles"),
  userId: v.id("users"),
  brief: v.string(),
  mediaType: v.union(v.literal("text"), v.literal("image"), v.literal("video")),
  channel: v.string(),
  tone: v.string(),
  text: v.optional(v.string()),
  imageKey: v.optional(v.string()),
  videoKey: v.optional(v.string()),
  status: v.union(
    v.literal("generated"),
    v.literal("edited"),
    v.literal("scheduled"),
    v.literal("published"),
    v.literal("discarded"),
  ),
});

export const persistRunAndDraft = internalMutation({
  args: {
    runFields: runFieldsValidator,
    draftFields: draftFieldsValidator,
  },
  returns: v.object({
    runId: v.id("agent_runs"),
    draftId: v.id("postgen_drafts"),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const runId = await ctx.db.insert("agent_runs", { ...args.runFields, createdAt: now });
    const draftId = await ctx.db.insert("postgen_drafts", {
      ...args.draftFields,
      agentRunId: runId,
      createdAt: now,
      updatedAt: now,
    });
    return { runId, draftId };
  },
});

export const persistRunOnly = internalMutation({
  args: { runFields: runFieldsValidator },
  returns: v.id("agent_runs"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("agent_runs", {
      ...args.runFields,
      createdAt: Date.now(),
    });
  },
});
