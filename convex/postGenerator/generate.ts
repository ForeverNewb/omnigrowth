"use node";
import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { AgentError, invoke as invokePostWriter } from "../../agents/post-writer";
import { isChannel } from "../../agents/post-writer/channels";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { type ActionCtx, action } from "../_generated/server";

export const generate = action({
  args: {
    brandId: v.id("brand_profiles"),
    brief: v.string(),
    channel: v.string(),
    tone: v.string(),
  },
  handler: async (
    ctx: ActionCtx,
    args: {
      brandId: Id<"brand_profiles">;
      brief: string;
      channel: string;
      tone: string;
    },
  ): Promise<{ draftId: Id<"postgen_drafts"> }> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError({ code: "UNAUTHENTICATED" });

    if (!args.brief.trim()) {
      throw new ConvexError({ code: "INVALID_BRIEF" });
    }

    if (!isChannel(args.channel)) {
      throw new ConvexError({ code: "INVALID_CHANNEL", channel: args.channel });
    }
    if (args.tone !== "warm" && args.tone !== "dry" && args.tone !== "bold") {
      throw new ConvexError({ code: "INVALID_TONE", tone: args.tone });
    }

    const brand = await ctx.runQuery(internal.brandProfile.brands.getById, {
      brandId: args.brandId,
    });
    if (!brand || brand.userId !== userId) {
      throw new ConvexError({ code: "NOT_FOUND" });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new ConvexError({ code: "MISSING_API_KEY" });

    const runFieldsBase = {
      agentId: "post-writer" as const,
      brandId: args.brandId,
      userId,
      input: args.brief,
      mediaType: "text" as const,
      providerUsed: "openrouter" as const,
    };

    try {
      const result = await invokePostWriter({
        brand: { name: brand.name, voice: brand.voice, description: brand.description },
        brief: args.brief,
        channel: args.channel,
        tone: args.tone,
        apiKey,
        traceContext: { agentId: "post-writer", brandId: args.brandId, userId },
      });

      const mutResult = await ctx.runMutation(internal.postGenerator.drafts.persistRunAndDraft, {
        runFields: {
          ...runFieldsBase,
          modelUsed: result.modelUsed,
          tokensIn: result.tokensIn,
          tokensOut: result.tokensOut,
          costUsd: result.costUsd,
          latencyMs: result.latencyMs,
          status: "ok" as const,
          output: result.text,
        },
        draftFields: {
          brandId: args.brandId,
          userId,
          brief: args.brief,
          mediaType: "text" as const,
          channel: args.channel,
          tone: args.tone,
          text: result.text,
          status: "generated" as const,
        },
      });

      return { draftId: mutResult.draftId };
    } catch (err) {
      if (err instanceof AgentError) {
        await ctx.runMutation(internal.postGenerator.drafts.persistRunOnly, {
          runFields: {
            ...runFieldsBase,
            modelUsed: "",
            tokensIn: 0,
            tokensOut: 0,
            costUsd: 0,
            latencyMs: 0,
            status: err.code === "GEN_REFUSED" ? ("refused" as const) : ("failed" as const),
            error: err.message,
          },
        });
        throw new ConvexError({ code: err.code, retryable: err.retryable });
      }
      throw err;
    }
  },
});
