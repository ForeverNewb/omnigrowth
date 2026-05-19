// postgen_drafts is the artifact users see and edit. Engineering telemetry
// (which model wrote it, cost) lives on agent_runs via agentRunId.
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const postGeneratorSchema = {
  postgen_drafts: defineTable({
    brandId: v.id("brand_profiles"),
    userId: v.id("users"),
    brief: v.string(),
    mediaType: v.union(v.literal("text"), v.literal("image"), v.literal("video")),
    channel: v.string(),              // "x" | "li" | "ig" | ...
    tone: v.string(),                 // "warm" | "dry" | "bold"
    text: v.optional(v.string()),     // populated for text drafts
    imageKey: v.optional(v.string()), // R2 object key, later slice
    videoKey: v.optional(v.string()), // R2 object key, later slice
    status: v.union(
      v.literal("generated"),
      v.literal("edited"),
      v.literal("scheduled"),
      v.literal("published"),
      v.literal("discarded"),
    ),
    agentRunId: v.id("agent_runs"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_brand", ["brandId", "createdAt"])
    .index("by_brand_status", ["brandId", "status"]),
} as const;
