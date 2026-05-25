import { observeOpenAI } from "langfuse";
import type OpenAI from "openai";

export type TraceContext = {
  agentId: string;
  brandId: string;
  userId: string;
};

/**
 * Wrap an OpenAI client with Langfuse tracing. No-op when LANGFUSE_PUBLIC_KEY
 * is unset so dev environments without Langfuse credentials still work.
 */
export function wrapWithLangfuse(client: OpenAI, ctx: TraceContext): OpenAI {
  if (!process.env.LANGFUSE_PUBLIC_KEY) return client;
  return observeOpenAI(client, {
    generationName: ctx.agentId,
    metadata: { brandId: ctx.brandId, userId: ctx.userId },
  }) as unknown as OpenAI;
}
