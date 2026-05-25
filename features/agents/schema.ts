// Cross-cutting observability for all agents (post-writer, future image/video agents).
// One row per model call; both successful and failed.
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const agentsSchema = {
  agent_runs: defineTable({
    agentId: v.string(), // "post-writer"
    brandId: v.id("brand_profiles"),
    userId: v.id("users"),
    input: v.string(), // user brief
    mediaType: v.union(v.literal("text"), v.literal("image"), v.literal("video")),
    modelUsed: v.string(), // internal; stripped from public queries
    providerUsed: v.string(), // "openrouter"
    tokensIn: v.number(),
    tokensOut: v.number(),
    costUsd: v.number(), // engineering telemetry; never shown to users
    latencyMs: v.number(),
    status: v.union(v.literal("ok"), v.literal("failed"), v.literal("refused")),
    output: v.optional(v.string()),
    error: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_brand", ["brandId", "createdAt"])
    .index("by_user", ["userId", "createdAt"]),
} as const;
