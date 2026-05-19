/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

const rawModules = import.meta.glob("../**/!(*.*.*)*.*s");
const modules = Object.fromEntries(
  Object.entries(rawModules).map(([path, mod]) => [
    path.startsWith("./") ? `../mediaLibrary/${path.slice(2)}` : path,
    mod,
  ]),
);

const asUser = (userId: string) => ({ subject: `${userId}|sess` });

async function seedUser(t: ReturnType<typeof convexTest>, email = "alice@example.com") {
  return t.run(async (ctx) => ctx.db.insert("users", { email, tier: "free" }));
}

async function seedBrand(t: ReturnType<typeof convexTest>, userId: string, name = "Lumen") {
  return t.run(async (ctx) =>
    ctx.db.insert("brand_profiles", {
      userId: userId as never,
      name,
      description: "",
      voice: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
}

async function seedAsset(
  t: ReturnType<typeof convexTest>,
  args: {
    brandId: string | null;
    key: string;
    createdAt: number;
    expiresAt?: number | null;
  },
) {
  return t.run(async (ctx) =>
    ctx.db.insert("media_assets", {
      brandId: args.brandId as never,
      key: args.key,
      source: "uploads",
      kind: "image",
      contentType: "image/png",
      sizeBytes: 1024,
      expiresAt: args.expiresAt ?? null,
      createdAt: args.createdAt,
    }),
  );
}

describe("media.assets.list", () => {
  it("returns the brand's assets newest first", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await seedUser(t);
    const brandId = await seedBrand(t, aliceId);
    const older = await seedAsset(t, {
      brandId,
      key: "dev/brand-x/uploads/a.png",
      createdAt: 1_000,
    });
    const newer = await seedAsset(t, {
      brandId,
      key: "dev/brand-x/uploads/b.png",
      createdAt: 2_000,
    });

    const result = await t
      .withIdentity(asUser(aliceId))
      .query(api.mediaLibrary.assets.list, { brandId: brandId as never });
    expect(result.map((r) => r._id)).toEqual([newer, older]);
  });

  it("does not leak another brand's assets", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await seedUser(t, "alice@example.com");
    const bobId = await seedUser(t, "bob@example.com");
    const aliceBrand = await seedBrand(t, aliceId, "Alice");
    const bobBrand = await seedBrand(t, bobId, "Bob");
    await seedAsset(t, {
      brandId: bobBrand,
      key: "dev/brand-bob/uploads/a.png",
      createdAt: 1,
    });

    const result = await t
      .withIdentity(asUser(aliceId))
      .query(api.mediaLibrary.assets.list, { brandId: aliceBrand as never });
    expect(result).toEqual([]);
  });

  it("throws NOT_FOUND when the caller does not own the brand", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await seedUser(t, "alice@example.com");
    const bobId = await seedUser(t, "bob@example.com");
    const aliceBrand = await seedBrand(t, aliceId, "Alice");

    await expect(
      t
        .withIdentity(asUser(bobId))
        .query(api.mediaLibrary.assets.list, { brandId: aliceBrand as never }),
    ).rejects.toThrowError(/NOT_FOUND/);
  });

  it("throws UNAUTHENTICATED when no identity is provided", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await seedUser(t);
    const brandId = await seedBrand(t, aliceId);

    await expect(
      t.query(api.mediaLibrary.assets.list, { brandId: brandId as never }),
    ).rejects.toThrowError(/UNAUTHENTICATED/);
  });
});

describe("media.assets.get", () => {
  it("returns the asset for the owner", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await seedUser(t);
    const brandId = await seedBrand(t, aliceId);
    const assetId = await seedAsset(t, {
      brandId,
      key: "dev/brand-x/uploads/a.png",
      createdAt: 1,
    });

    const got = await t
      .withIdentity(asUser(aliceId))
      .query(api.mediaLibrary.assets.get, { assetId: assetId as never });
    expect(got?._id).toBe(assetId);
  });

  it("returns null for a non-owner (no existence leak)", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await seedUser(t, "alice@example.com");
    const bobId = await seedUser(t, "bob@example.com");
    const brandId = await seedBrand(t, aliceId, "Alice");
    const assetId = await seedAsset(t, {
      brandId,
      key: "dev/brand-alice/uploads/a.png",
      createdAt: 1,
    });

    const got = await t
      .withIdentity(asUser(bobId))
      .query(api.mediaLibrary.assets.get, { assetId: assetId as never });
    expect(got).toBeNull();
  });
});

describe("media.assets.recordUpload", () => {
  it("inserts a row with computed expiresAt for free tier (7 days)", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await seedUser(t);
    const brandId = await seedBrand(t, aliceId);

    const before = Date.now();
    const assetId = await t
      .withIdentity(asUser(aliceId))
      .mutation(api.mediaLibrary.assets.recordUpload, {
        brandId: brandId as never,
        key: "dev/brand-x/uploads/asset-1.mp4",
        contentType: "video/mp4",
        sizeBytes: 12345,
        originalFilename: "vacation.mp4",
      });
    const after = Date.now();

    const stored = await t.run(async (ctx) => ctx.db.get(assetId));
    expect(stored?.brandId).toBe(brandId);
    expect(stored?.source).toBe("uploads");
    expect(stored?.kind).toBe("video");
    expect(stored?.contentType).toBe("video/mp4");
    expect(stored?.sizeBytes).toBe(12345);
    expect(stored?.originalFilename).toBe("vacation.mp4");
    expect(stored?.createdAt).toBeGreaterThanOrEqual(before);
    expect(stored?.createdAt).toBeLessThanOrEqual(after);
    expect(stored?.expiresAt).toBeGreaterThanOrEqual(before + 7 * 86_400_000);
    expect(stored?.expiresAt).toBeLessThanOrEqual(after + 7 * 86_400_000);
  });

  it("uses the user's tier for expiresAt (pro = 90 days)", async () => {
    const t = convexTest(schema, modules);
    const proId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "pro@example.com", tier: "pro" }),
    );
    const brandId = await seedBrand(t, proId, "ProBrand");

    const before = Date.now();
    const assetId = await t
      .withIdentity(asUser(proId))
      .mutation(api.mediaLibrary.assets.recordUpload, {
        brandId: brandId as never,
        key: "dev/brand-x/uploads/asset-2.mp4",
        contentType: "video/mp4",
        sizeBytes: 1,
      });

    const stored = await t.run(async (ctx) => ctx.db.get(assetId));
    expect(stored?.expiresAt).toBeGreaterThanOrEqual(before + 90 * 86_400_000);
  });

  it("throws NOT_FOUND when the caller does not own the brand", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await seedUser(t, "alice@example.com");
    const bobId = await seedUser(t, "bob@example.com");
    const aliceBrand = await seedBrand(t, aliceId, "Alice");

    await expect(
      t.withIdentity(asUser(bobId)).mutation(api.mediaLibrary.assets.recordUpload, {
        brandId: aliceBrand as never,
        key: "dev/brand-alice/uploads/x.png",
        contentType: "image/png",
        sizeBytes: 1,
      }),
    ).rejects.toThrowError(/NOT_FOUND/);
  });

  it("throws on a disallowed mime type", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await seedUser(t);
    const brandId = await seedBrand(t, aliceId);

    await expect(
      t.withIdentity(asUser(aliceId)).mutation(api.mediaLibrary.assets.recordUpload, {
        brandId: brandId as never,
        key: "dev/brand-x/uploads/evil.exe",
        contentType: "application/x-msdownload",
        sizeBytes: 1,
      }),
    ).rejects.toThrowError(/INVALID_CONTENT_TYPE/);
  });
});

describe("media.assets.remove", () => {
  it("marks the row expired so the cleanup cron will purge bytes + row", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await seedUser(t);
    const brandId = await seedBrand(t, aliceId);
    const assetId = await seedAsset(t, {
      brandId,
      key: "dev/brand-x/uploads/a.png",
      createdAt: 1,
    });

    await t
      .withIdentity(asUser(aliceId))
      .mutation(api.mediaLibrary.assets.remove, { assetId: assetId as never });

    const stored = await t.run(async (ctx) => ctx.db.get(assetId));
    expect(stored?.expiresAt).toBe(0);
  });

  it("throws NOT_FOUND when the caller does not own the asset's brand", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await seedUser(t, "alice@example.com");
    const bobId = await seedUser(t, "bob@example.com");
    const aliceBrand = await seedBrand(t, aliceId, "Alice");
    const assetId = await seedAsset(t, {
      brandId: aliceBrand,
      key: "dev/brand-alice/uploads/x.png",
      createdAt: 1,
    });

    await expect(
      t.withIdentity(asUser(bobId)).mutation(api.mediaLibrary.assets.remove, {
        assetId: assetId as never,
      }),
    ).rejects.toThrowError(/NOT_FOUND/);

    const stored = await t.run(async (ctx) => ctx.db.get(assetId));
    expect(stored).not.toBeNull();
  });
});
