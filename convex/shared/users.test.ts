/// <reference types="vite/client" />

// Tests for convex/shared/users.ts.
//
// Backfill coverage (tests-after) — code already shipped in the auth bundle.
// For new mutations, drive them test-first instead.

import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

// See convex/brandProfile/brands.test.ts for the explanation of why this
// rewrite is needed. TL;DR: Vite normalises sibling-dir glob keys to `./X`
// which confuses convex-test's prefix derivation. The rewrite restores the
// expected `../shared/X` form.
const rawModules = import.meta.glob("../**/!(*.*.*)*.*s");
const modules = Object.fromEntries(
  Object.entries(rawModules).map(([path, mod]) => [
    path.startsWith("./") ? `../shared/${path.slice(2)}` : path,
    mod,
  ]),
);

const asUser = (userId: string) => ({ subject: `${userId}|sess` });

describe("users.setName", () => {
  it("patches the viewer's name when called by an authenticated user", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "alice@example.com", tier: "free" }),
    );

    await t.withIdentity(asUser(aliceId)).mutation(api.shared.users.setName, { name: "Alice" });

    const updated = await t.run((ctx) => ctx.db.get(aliceId));
    expect(updated?.name).toBe("Alice");
  });

  it("trims surrounding whitespace before storing", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "alice@example.com", tier: "free" }),
    );

    await t.withIdentity(asUser(aliceId)).mutation(api.shared.users.setName, { name: "  Alice  " });

    const updated = await t.run((ctx) => ctx.db.get(aliceId));
    expect(updated?.name).toBe("Alice");
  });

  it("throws INVALID_NAME when given an empty string", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "alice@example.com", tier: "free" }),
    );

    await expect(
      t.withIdentity(asUser(aliceId)).mutation(api.shared.users.setName, { name: "" }),
    ).rejects.toThrow(/INVALID_NAME/);
  });

  it("throws INVALID_NAME when given only whitespace", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "alice@example.com", tier: "free" }),
    );

    await expect(
      t.withIdentity(asUser(aliceId)).mutation(api.shared.users.setName, { name: "   " }),
    ).rejects.toThrow(/INVALID_NAME/);
  });

  it("throws UNAUTHENTICATED when called without an identity", async () => {
    const t = convexTest(schema, modules);

    await expect(t.mutation(api.shared.users.setName, { name: "Alice" })).rejects.toThrow(
      /UNAUTHENTICATED/,
    );
  });
});
