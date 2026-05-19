/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";

const rawModules = import.meta.glob("../**/!(*.*.*)*.*s");
const modules = Object.fromEntries(
  Object.entries(rawModules).map(([path, mod]) => [
    path.startsWith("./") ? `../postGenerator/${path.slice(2)}` : path,
    mod,
  ]),
);

async function seedUserAndBrand(
  t: ReturnType<typeof convexTest>,
): Promise<{ userId: Id<"users">; brandId: Id<"brand_profiles"> }> {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { email: "alice@omnigrowth.dev", tier: "free" });
    const now = Date.now();
    const brandId = await ctx.db.insert("brand_profiles", {
      userId,
      name: "Acme",
      description: "small business CRM",
      voice: "warm and direct",
      createdAt: now,
      updatedAt: now,
    });
    return { userId, brandId };
  });
}

const runFields = (userId: Id<"users">, brandId: Id<"brand_profiles">) => ({
  agentId: "post-writer",
  brandId,
  userId,
  input: "hi",
  mediaType: "text" as const,
  modelUsed: "anthropic/claude-sonnet-4-6",
  providerUsed: "openrouter",
  tokensIn: 10,
  tokensOut: 20,
  costUsd: 0.001,
  latencyMs: 250,
  status: "ok" as const,
  output: "hello",
});

const draftFields = (userId: Id<"users">, brandId: Id<"brand_profiles">) => ({
  brandId,
  userId,
  brief: "hi",
  mediaType: "text" as const,
  channel: "x",
  tone: "warm",
  text: "hello",
  status: "generated" as const,
});

describe("postGenerator/drafts mutations", () => {
  it("persistRunAndDraft inserts both rows and links them via agentRunId", async () => {
    const t = convexTest(schema, modules);
    const { userId, brandId } = await seedUserAndBrand(t);
    const { runId, draftId } = await t.mutation(internal.postGenerator.drafts.persistRunAndDraft, {
      runFields: runFields(userId, brandId),
      draftFields: draftFields(userId, brandId),
    });
    const run = await t.run((ctx) => ctx.db.get(runId));
    const draft = await t.run((ctx) => ctx.db.get(draftId));
    expect(run?.status).toBe("ok");
    expect(draft?.text).toBe("hello");
    expect(draft?.agentRunId).toBe(runId);
    expect(draft?.createdAt).toBeGreaterThan(0);
    expect(draft?.updatedAt).toBeGreaterThan(0);
  });

  it("persistRunOnly inserts the run with failed status and no draft", async () => {
    const t = convexTest(schema, modules);
    const { userId, brandId } = await seedUserAndBrand(t);
    const runId = await t.mutation(internal.postGenerator.drafts.persistRunOnly, {
      runFields: {
        ...runFields(userId, brandId),
        status: "failed" as const,
        output: undefined,
        error: "boom",
      },
    });
    const run = await t.run((ctx) => ctx.db.get(runId));
    expect(run?.status).toBe("failed");
    expect(run?.error).toBe("boom");

    const drafts = await t.run((ctx) =>
      ctx.db
        .query("postgen_drafts")
        .withIndex("by_brand", (q) => q.eq("brandId", brandId))
        .collect(),
    );
    expect(drafts).toHaveLength(0);
  });
});
