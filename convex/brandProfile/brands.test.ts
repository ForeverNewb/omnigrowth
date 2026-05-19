/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

// convex-test needs a glob of every function module so it can register them
// on the in-memory backend. The glob is rooted at the convex/ directory.
// `!(*.*.*)` excludes files like `brands.test.ts` (two dots in the name) so
// test files don't get loaded as function modules.
//
// Vite's `import.meta.glob` normalizes sibling-directory matches to `./X`
// (instead of `../brandProfile/X`), which confuses convex-test's prefix
// computation. Without this rewrite, convex-test throws
// `Could not find module for: "brandProfile/brands"` because the prefix it
// derives from `_generated/` doesn't match the `./` keys Vite produced.
// We normalize keys so every entry lives at the same depth as the
// `_generated/` dir that convex-test uses to anchor its prefix.
//
// TODO: extract to a shared `convex/test-utils.ts` helper before adding a
// second feature test directory (e.g. `convex/<other>/X.test.ts`). Currently
// only `brandProfile` needs it, so we keep the rewrite inline.
const rawModules = import.meta.glob("../**/!(*.*.*)*.*s");
const modules = Object.fromEntries(
  Object.entries(rawModules).map(([path, mod]) => [
    path.startsWith("./") ? `../brandProfile/${path.slice(2)}` : path,
    mod,
  ]),
);

// Helper: builds an identity whose `subject` matches the convex-auth
// `<userId>|<sessionId>` shape so getAuthUserId(ctx) can extract the userId.
// Verified against node_modules/@convex-dev/auth/dist/server/implementation/index.js:347.
const asUser = (userId: string) => ({ subject: `${userId}|sess` });

describe("brands.list", () => {
  it("returns the caller's brands ordered by createdAt ascending", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "alice@example.com", tier: "free" }),
    );

    const t0 = Date.now();
    const olderId = await t.run(async (ctx) =>
      ctx.db.insert("brand_profiles", {
        userId: aliceId,
        name: "Older",
        description: "",
        voice: "",
        createdAt: t0,
        updatedAt: t0,
      }),
    );
    const newerId = await t.run(async (ctx) =>
      ctx.db.insert("brand_profiles", {
        userId: aliceId,
        name: "Newer",
        description: "",
        voice: "",
        createdAt: t0 + 1000,
        updatedAt: t0 + 1000,
      }),
    );

    const result = await t.withIdentity(asUser(aliceId)).query(api.brandProfile.brands.list, {});
    expect(result.map((b) => b._id)).toEqual([olderId, newerId]);
  });

  it("returns [] for a fresh signed-in user with no brands", async () => {
    const t = convexTest(schema, modules);
    const bobId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "bob@example.com", tier: "free" }),
    );
    const result = await t.withIdentity(asUser(bobId)).query(api.brandProfile.brands.list, {});
    expect(result).toEqual([]);
  });

  it("does not leak other users' brands", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "alice@example.com", tier: "free" }),
    );
    const bobId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "bob@example.com", tier: "free" }),
    );
    await t.run(async (ctx) =>
      ctx.db.insert("brand_profiles", {
        userId: aliceId,
        name: "Alice's Brand",
        description: "",
        voice: "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );

    const result = await t.withIdentity(asUser(bobId)).query(api.brandProfile.brands.list, {});
    expect(result).toEqual([]);
  });
});

describe("brands.get", () => {
  it("returns the brand when the caller owns it", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "alice@example.com", tier: "free" }),
    );
    const brandId = await t.run(async (ctx) =>
      ctx.db.insert("brand_profiles", {
        userId: aliceId,
        name: "Alice's",
        description: "",
        voice: "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );

    const result = await t
      .withIdentity(asUser(aliceId))
      .query(api.brandProfile.brands.get, { brandId });

    expect(result?._id).toBe(brandId);
    expect(result?.name).toBe("Alice's");
  });

  it("returns null when the caller is not the owner (no existence leak)", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "alice@example.com", tier: "free" }),
    );
    const bobId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "bob@example.com", tier: "free" }),
    );
    const brandId = await t.run(async (ctx) =>
      ctx.db.insert("brand_profiles", {
        userId: aliceId,
        name: "Alice's",
        description: "",
        voice: "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );

    const result = await t
      .withIdentity(asUser(bobId))
      .query(api.brandProfile.brands.get, { brandId });

    expect(result).toBeNull();
  });

  it("returns null when the brandId does not exist", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "alice@example.com", tier: "free" }),
    );
    // Insert and immediately delete to get a valid-shape but non-existent id.
    const brandId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("brand_profiles", {
        userId: aliceId,
        name: "Tmp",
        description: "",
        voice: "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.delete(id);
      return id;
    });

    const result = await t
      .withIdentity(asUser(aliceId))
      .query(api.brandProfile.brands.get, { brandId });

    expect(result).toBeNull();
  });
});

describe("brands.create", () => {
  it("creates a brand with default empty description and voice", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "alice@example.com", tier: "free" }),
    );

    const brandId = await t
      .withIdentity(asUser(aliceId))
      .mutation(api.brandProfile.brands.create, { name: "First" });

    const stored = await t.run(async (ctx) => ctx.db.get(brandId));
    expect(stored?.name).toBe("First");
    expect(stored?.description).toBe("");
    expect(stored?.voice).toBe("");
    expect(stored?.userId).toBe(aliceId);
    expect(typeof stored?.createdAt).toBe("number");
    expect(stored?.createdAt).toBe(stored?.updatedAt);
  });

  it("preserves description and voice when provided", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "alice@example.com", tier: "free" }),
    );

    const brandId = await t.withIdentity(asUser(aliceId)).mutation(api.brandProfile.brands.create, {
      name: "Second",
      description: "soft cosmetics",
      voice: "warm, slow",
    });

    const stored = await t.run(async (ctx) => ctx.db.get(brandId));
    expect(stored?.description).toBe("soft cosmetics");
    expect(stored?.voice).toBe("warm, slow");
  });

  it("throws BRAND_QUOTA_EXCEEDED when free user tries to create a second brand", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "alice@example.com", tier: "free" }),
    );
    const asAlice = t.withIdentity(asUser(aliceId));

    await asAlice.mutation(api.brandProfile.brands.create, { name: "First" });

    await expect(
      asAlice.mutation(api.brandProfile.brands.create, { name: "Second" }),
    ).rejects.toThrowError(/BRAND_QUOTA_EXCEEDED/);
  });

  it("allows pro user to create up to 3 brands", async () => {
    const t = convexTest(schema, modules);
    const proId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "pro@example.com", tier: "pro" }),
    );
    const asPro = t.withIdentity(asUser(proId));

    await asPro.mutation(api.brandProfile.brands.create, { name: "A" });
    await asPro.mutation(api.brandProfile.brands.create, { name: "B" });
    await asPro.mutation(api.brandProfile.brands.create, { name: "C" });

    await expect(
      asPro.mutation(api.brandProfile.brands.create, { name: "D" }),
    ).rejects.toThrowError(/BRAND_QUOTA_EXCEEDED/);
  });

  it("throws UNAUTHENTICATED when no identity is provided", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.brandProfile.brands.create, { name: "Anything" }),
    ).rejects.toThrowError(/UNAUTHENTICATED/);
  });

  it("throws INVALID_NAME when given an empty string", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "alice@example.com", tier: "free" }),
    );
    await expect(
      t.withIdentity(asUser(aliceId)).mutation(api.brandProfile.brands.create, { name: "" }),
    ).rejects.toThrowError(/INVALID_NAME/);
  });

  it("throws INVALID_NAME when given only whitespace", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "alice@example.com", tier: "free" }),
    );
    await expect(
      t.withIdentity(asUser(aliceId)).mutation(api.brandProfile.brands.create, { name: "   " }),
    ).rejects.toThrowError(/INVALID_NAME/);
  });

  it("trims surrounding whitespace from the stored name", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "alice@example.com", tier: "free" }),
    );

    const brandId = await t
      .withIdentity(asUser(aliceId))
      .mutation(api.brandProfile.brands.create, { name: "  Lumen  " });

    const stored = await t.run(async (ctx) => ctx.db.get(brandId));
    expect(stored?.name).toBe("Lumen");
  });
});

describe("brands.rename", () => {
  it("renames a brand the caller owns and bumps updatedAt", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "alice@example.com", tier: "free" }),
    );
    const t0 = 1_000_000;
    const brandId = await t.run(async (ctx) =>
      ctx.db.insert("brand_profiles", {
        userId: aliceId,
        name: "Old",
        description: "",
        voice: "",
        createdAt: t0,
        updatedAt: t0,
      }),
    );

    await t
      .withIdentity(asUser(aliceId))
      .mutation(api.brandProfile.brands.rename, { brandId, name: "New" });

    const stored = await t.run(async (ctx) => ctx.db.get(brandId));
    expect(stored?.name).toBe("New");
    expect(stored?.updatedAt).toBeGreaterThan(t0);
    expect(stored?.createdAt).toBe(t0);
  });

  it("throws NOT_FOUND when the caller does not own the brand", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "alice@example.com", tier: "free" }),
    );
    const bobId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "bob@example.com", tier: "free" }),
    );
    const brandId = await t.run(async (ctx) =>
      ctx.db.insert("brand_profiles", {
        userId: aliceId,
        name: "Alice's",
        description: "",
        voice: "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );

    await expect(
      t
        .withIdentity(asUser(bobId))
        .mutation(api.brandProfile.brands.rename, { brandId, name: "Hijacked" }),
    ).rejects.toThrowError(/NOT_FOUND/);
  });

  it("throws INVALID_NAME when given an empty string", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "alice@example.com", tier: "free" }),
    );
    const brandId = await t.run(async (ctx) =>
      ctx.db.insert("brand_profiles", {
        userId: aliceId,
        name: "Old",
        description: "",
        voice: "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );
    await expect(
      t
        .withIdentity(asUser(aliceId))
        .mutation(api.brandProfile.brands.rename, { brandId, name: "" }),
    ).rejects.toThrowError(/INVALID_NAME/);
  });

  it("throws INVALID_NAME when given only whitespace", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "alice@example.com", tier: "free" }),
    );
    const brandId = await t.run(async (ctx) =>
      ctx.db.insert("brand_profiles", {
        userId: aliceId,
        name: "Old",
        description: "",
        voice: "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );
    await expect(
      t
        .withIdentity(asUser(aliceId))
        .mutation(api.brandProfile.brands.rename, { brandId, name: "   " }),
    ).rejects.toThrowError(/INVALID_NAME/);
  });

  it("trims surrounding whitespace from the stored name", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "alice@example.com", tier: "free" }),
    );
    const brandId = await t.run(async (ctx) =>
      ctx.db.insert("brand_profiles", {
        userId: aliceId,
        name: "Old",
        description: "",
        voice: "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );

    await t
      .withIdentity(asUser(aliceId))
      .mutation(api.brandProfile.brands.rename, { brandId, name: "  Renamed  " });

    const stored = await t.run(async (ctx) => ctx.db.get(brandId));
    expect(stored?.name).toBe("Renamed");
  });
});

describe("brands.remove", () => {
  it("deletes a brand the caller owns", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "alice@example.com", tier: "free" }),
    );
    const brandId = await t.run(async (ctx) =>
      ctx.db.insert("brand_profiles", {
        userId: aliceId,
        name: "Doomed",
        description: "",
        voice: "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );

    await t.withIdentity(asUser(aliceId)).mutation(api.brandProfile.brands.remove, { brandId });

    const stored = await t.run(async (ctx) => ctx.db.get(brandId));
    expect(stored).toBeNull();
  });

  it("throws NOT_FOUND when the caller does not own the brand", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "alice@example.com", tier: "free" }),
    );
    const bobId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "bob@example.com", tier: "free" }),
    );
    const brandId = await t.run(async (ctx) =>
      ctx.db.insert("brand_profiles", {
        userId: aliceId,
        name: "Alice's",
        description: "",
        voice: "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );

    await expect(
      t.withIdentity(asUser(bobId)).mutation(api.brandProfile.brands.remove, { brandId }),
    ).rejects.toThrowError(/NOT_FOUND/);

    // Confirm the brand still exists (the failed delete didn't half-apply).
    const stored = await t.run(async (ctx) => ctx.db.get(brandId));
    expect(stored).not.toBeNull();
  });

  it("cascades by patching expiresAt to 0 on media_assets owned by the deleted brand", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "alice@example.com", tier: "free" }),
    );
    const brandId = await t.run(async (ctx) =>
      ctx.db.insert("brand_profiles", {
        userId: aliceId,
        name: "Doomed",
        description: "",
        voice: "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );
    const assetId = await t.run(async (ctx) =>
      ctx.db.insert("media_assets", {
        brandId,
        key: "uploads/doomed/asset-1.jpg",
        source: "uploads",
        kind: "image",
        contentType: "image/jpeg",
        sizeBytes: 1024,
        expiresAt: null,
        createdAt: Date.now(),
      }),
    );

    await t.withIdentity(asUser(aliceId)).mutation(api.brandProfile.brands.remove, { brandId });

    const asset = await t.run((ctx) => ctx.db.get(assetId));
    expect(asset?.expiresAt).toBe(0);
  });

  it("does not touch media_assets owned by other brands", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "alice@example.com", tier: "free" }),
    );
    const doomedId = await t.run(async (ctx) =>
      ctx.db.insert("brand_profiles", {
        userId: aliceId,
        name: "Doomed",
        description: "",
        voice: "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );
    const safeId = await t.run(async (ctx) =>
      ctx.db.insert("brand_profiles", {
        userId: aliceId,
        name: "Safe",
        description: "",
        voice: "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );
    const safeAssetId = await t.run(async (ctx) =>
      ctx.db.insert("media_assets", {
        brandId: safeId,
        key: "uploads/safe/asset-1.jpg",
        source: "uploads",
        kind: "image",
        contentType: "image/jpeg",
        sizeBytes: 1024,
        expiresAt: null,
        createdAt: Date.now(),
      }),
    );

    await t
      .withIdentity(asUser(aliceId))
      .mutation(api.brandProfile.brands.remove, { brandId: doomedId });

    const safeAsset = await t.run((ctx) => ctx.db.get(safeAssetId));
    expect(safeAsset?.expiresAt).toBe(null);
  });

  it("does not touch global (null brandId) media_assets", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "alice@example.com", tier: "free" }),
    );
    const brandId = await t.run(async (ctx) =>
      ctx.db.insert("brand_profiles", {
        userId: aliceId,
        name: "Doomed",
        description: "",
        voice: "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );
    const premadeId = await t.run(async (ctx) =>
      ctx.db.insert("media_assets", {
        brandId: null,
        key: "premade/clip-1.mp4",
        source: "premade",
        kind: "video",
        contentType: "video/mp4",
        sizeBytes: 4096,
        expiresAt: null,
        createdAt: Date.now(),
      }),
    );

    await t.withIdentity(asUser(aliceId)).mutation(api.brandProfile.brands.remove, { brandId });

    const premade = await t.run((ctx) => ctx.db.get(premadeId));
    expect(premade?.expiresAt).toBe(null);
  });
});
