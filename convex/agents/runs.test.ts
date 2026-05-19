/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import schema from "../schema";

const rawModules = import.meta.glob("../**/!(*.*.*)*.*s");
const modules = Object.fromEntries(
  Object.entries(rawModules).map(([path, mod]) => [
    path.startsWith("./") ? `../agents/${path.slice(2)}` : path,
    mod,
  ]),
);

const asUser = (userId: string) => ({ subject: `${userId}|sess` });

async function seedUserAndBrand(t: ReturnType<typeof convexTest>) {
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

const runFixture = (userId: Id<"users">, brandId: Id<"brand_profiles">) => ({
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

describe("agents/runs", () => {
  it("write inserts a row with createdAt populated", async () => {
    const t = convexTest(schema, modules);
    const { userId, brandId } = await seedUserAndBrand(t);
    const runId = await t.mutation(internal.agents.runs.write, runFixture(userId, brandId));
    const row = await t.run((ctx) => ctx.db.get(runId));
    expect(row?.createdAt).toBeGreaterThan(0);
    expect(row?.status).toBe("ok");
  });

  it("listByBrandPublic strips modelUsed, providerUsed, and costUsd", async () => {
    const t = convexTest(schema, modules);
    const { userId, brandId } = await seedUserAndBrand(t);
    await t.mutation(internal.agents.runs.write, runFixture(userId, brandId));
    const asAlice = t.withIdentity(asUser(userId));
    const rows = await asAlice.query(api.agents.runs.listByBrandPublic, { brandId });
    expect(rows).toHaveLength(1);
    expect(rows[0]).not.toHaveProperty("modelUsed");
    expect(rows[0]).not.toHaveProperty("providerUsed");
    expect(rows[0]).not.toHaveProperty("costUsd");
    expect(rows[0].status).toBe("ok");
  });

  it("listByBrandInternal includes modelUsed, providerUsed, and costUsd", async () => {
    const t = convexTest(schema, modules);
    const { userId, brandId } = await seedUserAndBrand(t);
    await t.mutation(internal.agents.runs.write, runFixture(userId, brandId));
    const rows = await t.query(internal.agents.runs.listByBrandInternal, { brandId });
    expect(rows[0].modelUsed).toBe("anthropic/claude-sonnet-4-6");
    expect(rows[0].providerUsed).toBe("openrouter");
    expect(rows[0].costUsd).toBe(0.001);
  });

  it("listByBrandPublic rejects unauthenticated callers", async () => {
    const t = convexTest(schema, modules);
    const { brandId } = await seedUserAndBrand(t);
    await expect(t.query(api.agents.runs.listByBrandPublic, { brandId })).rejects.toThrow(
      /UNAUTHENTICATED/,
    );
  });

  it("listByBrandPublic rejects callers who don't own the brand", async () => {
    const t = convexTest(schema, modules);
    const { brandId } = await seedUserAndBrand(t);
    const otherUserId = await t.run((ctx) =>
      ctx.db.insert("users", { email: "bob@omnigrowth.dev", tier: "free" }),
    );
    const asBob = t.withIdentity(asUser(otherUserId));
    await expect(asBob.query(api.agents.runs.listByBrandPublic, { brandId })).rejects.toThrow(
      /NOT_FOUND/,
    );
  });
});
