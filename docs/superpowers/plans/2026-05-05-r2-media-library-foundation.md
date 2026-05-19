# R2 + Media Library Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land Cloudflare R2 as the binary-storage backbone for OmniGrowth: a typed S3 client wrapper, a `media_assets` table scoped by `brandId`, a presigned-upload + signed-read flow, tier-based retention with a daily cleanup cron, and a minimal `/b/[brandId]/media` page that proves the pipe end-to-end. The render worker, AI image generator, and admin premade-seeding script reuse the same library and schema later.

**Architecture:** Bucket holds **no public objects** — every read mints a 24-hour signed GET URL via a Convex action; every browser upload uses a 15-minute signed PUT URL. Brand isolation is enforced at the Convex query/mutation/action layer: callers must own the `brandId` they reference, and signed URLs are only minted for assets the caller owns. The R2 key scheme `<env>/<scope>/<kind>/<id>.<ext>` exists for traceability and admin-side prefix scans, **not** for security. Retention is app-driven: each row carries `expiresAt`, a daily cron purges expired rows + their R2 objects in one transaction. Tier limits live in `lib/billing/tiers.ts` next to the existing brand quota.

**Tech Stack:** Next.js 16 App Router, Convex 1.17, `@convex-dev/auth` 0.0.92, `@aws-sdk/client-s3` v3 + `@aws-sdk/s3-request-presigner` v3, Vitest + `convex-test`, TypeScript, Biome.

**Source decisions:** In-conversation (sessions `ae4c5660` 2026-05-04 and the current session 2026-05-05). Locked answers:
- **Q1 — Scope:** Foundation-first. Land the R2 client wrapper, env wiring, `media_assets` schema, presigned-upload + list Convex actions, and a minimal `/b/[brandId]/media` page. No tags/filters/delete-UI in v1 (delete mutation exists but is not surfaced). Premade catalog seeding and render-worker / AI-image integrations are explicit follow-ups.
- **Q2 — Upload path:** Presigned PUT for browser uploads. Server-side S3 client for premade catalog, render-worker outputs, AI-generated images. Both share `lib/r2/`.
- **Q3 — Retention:** App-driven. `expiresAt: number | null` on each row; nightly Convex scheduled function purges expired rows + their R2 objects. Defaults: free 7d / pro 90d / agency 365d for `uploads`; `premade`, `ai-images`, `renders`, `brand-assets` get `expiresAt: null` (never expire). Defaults live in a single `UPLOAD_RETENTION_DAYS_BY_TIER` map.
- **Q4 — Public URL:** N/A — bucket has no public access. All reads go through `getSignedReadUrl(brandId, assetId)` minted via Convex action. The `R2_PUBLIC_URL` env var is removed.
- **Q5 — Key scheme:** `<env>/<scope>/<kind>/<id>.<ext>` where `<env>` ∈ `dev|prod`, `<scope>` is `brand-<brandId>` or `global`, `<kind>` ∈ `uploads|premade|ai-images|renders|brand-assets`, `<id>` is the Convex `_id` of the metadata row, `<ext>` is the lowercased original extension allowlisted to `.mp4 .mov .webm .png .jpg .jpeg .gif .webp`.
- **Q6 — Read access:** Signed URLs only. Bucket has no public access. No `<video src>` or `<img src>` ever points at a permanent R2 URL.
- **TTL:** Browser GET 24h, browser PUT 15m. Server-to-server reads use the S3 client directly with the access keys (no signing, no TTL — relevant for the future render worker reading premade clips during a 2h render).

**Source docs touched on completion:**
- `docs/features/media-library.md` — flip status from `stub` to `v1 shipped (foundation)`, swap "Cloudflare CDN-served" / public language for "all reads via 24h signed URLs"
- `docs/architecture.md` — under § Storage layer, replace "served through the Cloudflare global edge. Each user-facing URL is either a public R2 dev URL or a custom-domain CNAME" with "served via short-lived signed URLs minted by Convex; the bucket has no public access"

---

## File Structure

**New files:**

`lib/r2/` — pure helpers + S3 client factory. Anything cross-feature (render worker, post-generator AI images, admin seeding) imports from here.
- `lib/r2/keys.ts` — pure: builds `<env>/<scope>/<kind>/<id>.<ext>`, parses keys back out, normalises extensions.
- `lib/r2/keys.test.ts`
- `lib/r2/mime.ts` — pure: extension allowlist, mime-from-extension, `kind` validation.
- `lib/r2/mime.test.ts`
- `lib/r2/retention.ts` — pure: `expiresAtFor(source, tier, now)` returning `number | null`.
- `lib/r2/retention.test.ts`
- `lib/r2/config.ts` — env reader. Throws clearly if a required R2 env is missing. Exports `R2Config` type and `getR2Config()`. Pure (no side effects beyond env reads).
- `lib/r2/config.test.ts`
- `lib/r2/client.ts` — S3 client factory + `presignPut`, `presignGet`, `deleteObject`, `headObject` thin wrappers. Uses `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`. **Node-only.**
- `lib/billing/tiers.ts` — *modified* (see below) to add `UPLOAD_RETENTION_DAYS_BY_TIER`.

`features/media-library/` — feature folder following the established pattern.
- `features/media-library/schema.ts` — `media_assets` table fragment + indexes.
- `features/media-library/feature.config.ts` — feature manifest.
- `features/media-library/README.md` — pointer to `docs/features/media-library.md`.
- `features/media-library/components/MediaUploader.tsx` — drag-and-drop or file-picker uploader. Calls `presignUpload` action, `PUT`s to R2, calls `recordUpload` mutation.
- `features/media-library/components/MediaGrid.tsx` — renders thumbnails / placeholders for the brand's `media_assets`. Calls `presignRead` action per visible item to get a 24h signed URL.

`convex/mediaLibrary/` — Convex functions. Lives under `convex/`, not `features/media-library/convex/`, for the same reason `convex/brandProfile/` does (see `docs/superpowers/plans/2026-05-04-brand-profile.md` Pre-flight note 5). Imports inside this directory use **relative paths**, not `@/` aliases.
- `convex/mediaLibrary/assets.ts` — queries (`list`, `get`) + mutations (`recordUpload`, `remove`). V8 runtime (default).
- `convex/mediaLibrary/assets.test.ts` — convex-test.
- `convex/mediaLibrary/presign.ts` — Node-runtime actions (`presignUpload`, `presignRead`). Has `"use node";` at the top because `@aws-sdk/client-s3` requires the Node runtime. **Not** unit-tested via convex-test (Node-runtime functions can't run inside convex-test's edge-runtime). Manual smoke test step covers it.
- `convex/mediaLibrary/cleanup.ts` — Node-runtime internal action (`purgeExpired`). `"use node";`. Hand-tested.
- `convex/crons.ts` — Convex scheduled functions registry (new file). Registers the daily `purgeExpired` run.

`app/(app)/dash/b/[brandId]/media/` — minimal page.
- `app/(app)/dash/b/[brandId]/media/page.tsx` — composes `MediaUploader` + `MediaGrid`. No new styles; uses existing `app-page-head` / `card` / `grid-4` classes from `app/globals.css` per Pre-flight note 3.

**Modified files:**
- `convex/schema.ts` — add `mediaLibrarySchema` import + spread.
- `lib/billing/tiers.ts` — add `UPLOAD_RETENTION_DAYS_BY_TIER` constant alongside the existing `BRAND_LIMIT_BY_TIER`.
- `lib/billing/tiers.test.ts` — add coverage for the new map (no helper to test, just a shape assertion mirroring the existing `BRAND_LIMIT_BY_TIER` test).
- `package.json` — add `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` runtime deps.
- `.env.local` — set `R2_ENDPOINT`, fill `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` (user-supplied via Pre-flight step 1), **remove `R2_PUBLIC_URL`** (no longer used). Per-task instructions specify exact lines.
- `docs/features/media-library.md` — status flip + correctness pass on the public-CDN language.
- `docs/architecture.md` — single-paragraph correctness pass on the storage-layer description.

**Deleted files:** none.

---

## Pre-flight (read before starting)

1. **R2 account and bucket setup is a manual user step that must be done before Task 5.** The implementer cannot do this in code — it requires the user's Cloudflare login. Required steps, in order:

   a. Cloudflare dashboard → R2 → "Create bucket" → name `omnigrowth-media-dev` → location: Automatic.
   b. **Do NOT enable public access.** Leave the bucket private. The "Public Access" tab should show "Public Access: Disabled" for both the bucket and any custom domains. (If the user previously enabled it, disable it now.)
   c. R2 → "Manage R2 API Tokens" → "Create API Token" → permissions: **Object Read & Write**, scope: bucket `omnigrowth-media-dev`. Save the Access Key ID + Secret Access Key.
   d. The R2 endpoint URL is shown on the bucket's settings page in the form `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`. Copy it.
   e. Paste the four values into `.env.local`:
      ```
      R2_ACCOUNT_ID=<account id>
      R2_ACCESS_KEY_ID=<access key id>
      R2_SECRET_ACCESS_KEY=<secret>
      R2_BUCKET=omnigrowth-media-dev
      R2_ENDPOINT=https://<account id>.r2.cloudflarestorage.com
      ```
      And **remove the `R2_PUBLIC_URL=` line** entirely.
   f. CORS — required for browser PUT to succeed. R2 → bucket → Settings → CORS Policy → paste:
      ```json
      [
        {
          "AllowedOrigins": ["http://localhost:3000", "https://omnigrowth.app"],
          "AllowedMethods": ["GET", "PUT", "HEAD"],
          "AllowedHeaders": ["*"],
          "ExposeHeaders": ["ETag"],
          "MaxAgeSeconds": 3600
        }
      ]
      ```
   g. Mirror the same R2 envs into the Convex deployment via `npx convex env set R2_ACCOUNT_ID …` (and the same for `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT`). Convex actions read these from `process.env`. Without this, `presignUpload` will throw at runtime.

2. **`@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` only run in Node, not in Convex's V8 runtime nor in Vitest's `edge-runtime`.** Practical consequences:
   - Files that import these packages must be Node-runtime only. Convex actions importing them need `"use node";` as the first line of the file.
   - `lib/r2/client.ts` is therefore Node-only. **Do not import it from Convex queries or mutations.** Queries and mutations should not exist that need to talk to R2 directly — anything that needs R2 is an action.
   - Vitest can't unit-test `lib/r2/client.ts` under `edge-runtime`. Skip it. Pure helpers (`keys.ts`, `mime.ts`, `retention.ts`, `config.ts`) cover the testable surface; the client wrapper is small and gets covered by manual smoke tests in Task 14.
   - `vitest.config.ts` already sets `environment: "edge-runtime"` for Convex testing. **Don't change it.** If a `lib/r2/client.test.ts` is ever added, it must opt out via a per-file `// @vitest-environment node` directive — but this plan does not add one.

3. **UI is intentionally minimal.** Per `MEMORY.md` "UI design source": real visuals come from a separate Claude Design session. The components in this plan use existing classes from `app/globals.css` (`app-page-head`, `card`, `grid-4`, `caption`, `btn`) following the precedent set by the brand-profile plan. **Do not introduce shadcn primitives in this plan.** A later PR will reskin once design lands.

4. **Convex actions cannot be tested with `convex-test`** — `convex-test` runs the V8/edge runtime only. The Node-runtime files (`presign.ts`, `cleanup.ts`) are not covered by unit tests in this plan. They're covered by:
   - The pure helpers they delegate to (`lib/r2/keys.ts`, `lib/r2/retention.ts`, `lib/r2/mime.ts`) — fully unit-tested.
   - Manual smoke tests in Task 14 + Task 15 — exercise the full upload + read flow against a real R2 bucket.
   - Defensive ownership checks in the underlying mutations (`recordUpload`, `remove`) and the `assets.list` query — fully covered by `convex-test` integration tests in Task 9.

5. **All R2 keys are constructed by `lib/r2/keys.ts`. Never hand-build a key string anywhere else.** This is the single point where the `<env>/<scope>/<kind>/<id>.<ext>` shape lives, and where every server-side write decides which env to put the object under. If a future feature (render worker, premade seeding script) needs a key, it imports `buildKey(...)`. This is enforced by code review, not by types.

6. **Schema migration safety.** Adding the new `media_assets` table is additive and doesn't migrate existing rows — Convex will accept the new schema without intervention. No `convex dashboard` clear is needed (unlike the brand-profile plan's Pre-flight note 1, which added a non-optional field to an existing table).

7. **Context7 was used to verify the AWS SDK v3 + R2 surface during planning.** Specifically: `PutObjectCommand` and `GetObjectCommand` are the operations passed to `getSignedUrl(...)` from `@aws-sdk/s3-request-presigner`; the S3 client is constructed with `region: "auto"`, `endpoint: R2_ENDPOINT`, and `forcePathStyle: false` (R2's S3 endpoint is virtual-hosted-style). If the implementer hits an API contradiction, re-fetch via Context7 (`npm:@aws-sdk/client-s3` + `npm:@aws-sdk/s3-request-presigner`) before changing the plan.

8. **Deferred follow-ups — explicitly NOT in this plan.** They reuse the same `lib/r2/` and schema:
   - Admin CLI (`pnpm r2:upload-premade`) for seeding the `premade` catalog under scope `global`.
   - Render-worker integration (Coolify side) — server-side S3 PUT for `renders` outputs.
   - Post-generator integration — server-side S3 PUT for `ai-images` outputs.
   - Tag/filter UI on the media page.
   - Delete button on the media grid (mutation exists; UI doesn't).
   - Brand-asset uploads (logo) — deferred along with brand-profile-v2 per `MEMORY.md` "Brand profile intent".

   Add these as Coda follow-up rows after this plan ships, not now.

---

## Task 1: Install AWS SDK dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install runtime deps**

Run:
```bash
pnpm add @aws-sdk/client-s3@^3.700.0 @aws-sdk/s3-request-presigner@^3.700.0
```

Expected: both appear under `"dependencies"` in `package.json`. Lockfile updates.

- [ ] **Step 2: Confirm typecheck still passes**

Run:
```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat: add AWS S3 SDK for Cloudflare R2"
```

---

## Task 2: R2 key builder + parser (pure)

**Files:**
- Create: `lib/r2/keys.ts`
- Create: `lib/r2/keys.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/r2/keys.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildKey, parseKey, normaliseExt, type AssetKind, type AssetScope } from "./keys";

describe("buildKey", () => {
  it("builds a brand-scoped uploads key", () => {
    expect(
      buildKey({
        env: "dev",
        scope: { kind: "brand", brandId: "k57x123abc" },
        assetKind: "uploads",
        id: "asset-3jq8xyz",
        ext: "mp4",
      }),
    ).toBe("dev/brand-k57x123abc/uploads/asset-3jq8xyz.mp4");
  });

  it("builds a global premade key", () => {
    expect(
      buildKey({
        env: "prod",
        scope: { kind: "global" },
        assetKind: "premade",
        id: "clip-veh-sedan-01",
        ext: "mp4",
      }),
    ).toBe("prod/global/premade/clip-veh-sedan-01.mp4");
  });

  it("lowercases the extension", () => {
    const key = buildKey({
      env: "dev",
      scope: { kind: "brand", brandId: "k57x" },
      assetKind: "uploads",
      id: "x",
      ext: "MP4",
    });
    expect(key.endsWith(".mp4")).toBe(true);
  });

  it("rejects an extension containing path characters", () => {
    expect(() =>
      buildKey({
        env: "dev",
        scope: { kind: "brand", brandId: "k57x" },
        assetKind: "uploads",
        id: "x",
        ext: "../etc/passwd",
      }),
    ).toThrow(/invalid extension/i);
  });

  it("rejects an id containing path separators", () => {
    expect(() =>
      buildKey({
        env: "dev",
        scope: { kind: "brand", brandId: "k57x" },
        assetKind: "uploads",
        id: "x/y",
        ext: "mp4",
      }),
    ).toThrow(/invalid id/i);
  });
});

describe("parseKey", () => {
  it("round-trips a brand-scoped key", () => {
    const original = "dev/brand-k57x123abc/uploads/asset-3jq8xyz.mp4";
    expect(parseKey(original)).toEqual({
      env: "dev",
      scope: { kind: "brand", brandId: "k57x123abc" },
      assetKind: "uploads",
      id: "asset-3jq8xyz",
      ext: "mp4",
    });
  });

  it("round-trips a global premade key", () => {
    const original = "prod/global/premade/clip-veh-sedan-01.mp4";
    expect(parseKey(original)).toEqual({
      env: "prod",
      scope: { kind: "global" },
      assetKind: "premade",
      id: "clip-veh-sedan-01",
      ext: "mp4",
    });
  });

  it("returns null for malformed input", () => {
    expect(parseKey("garbage")).toBeNull();
    expect(parseKey("dev/brand-k57x/uploads/no-extension")).toBeNull();
    expect(parseKey("nope/brand-k57x/uploads/x.mp4")).toBeNull();
  });
});

describe("normaliseExt", () => {
  it("strips a leading dot", () => {
    expect(normaliseExt(".MP4")).toBe("mp4");
  });

  it("lowercases", () => {
    expect(normaliseExt("PNG")).toBe("png");
  });

  it("returns null for empty", () => {
    expect(normaliseExt("")).toBeNull();
    expect(normaliseExt(".")).toBeNull();
  });
});

// Type-level assertions (compile-time only)
const _kinds: AssetKind[] = ["uploads", "premade", "ai-images", "renders", "brand-assets"];
const _scopes: AssetScope[] = [{ kind: "global" }, { kind: "brand", brandId: "x" }];
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test lib/r2/keys.test.ts`
Expected: FAIL — module `./keys` not found.

- [ ] **Step 3: Implement `lib/r2/keys.ts`**

```ts
// Pure helpers for building and parsing R2 object keys. Single source of truth
// for the `<env>/<scope>/<kind>/<id>.<ext>` shape. Every server-side write that
// produces a key must go through buildKey(). Hand-built key strings are a
// review-time bug.

export type AssetEnv = "dev" | "prod";

export type AssetScope = { kind: "global" } | { kind: "brand"; brandId: string };

export type AssetKind = "uploads" | "premade" | "ai-images" | "renders" | "brand-assets";

const ASSET_ENVS = ["dev", "prod"] as const;
const ASSET_KINDS = [
  "uploads",
  "premade",
  "ai-images",
  "renders",
  "brand-assets",
] as const satisfies readonly AssetKind[];

// id and ext sanity checks. These are not security boundaries — Convex schema
// types and the auth check at the call-site are. They are here so a malformed
// id or ext fails fast with a clear error rather than producing a key that
// only blows up at S3 PUT time.
const SAFE_TOKEN = /^[A-Za-z0-9_-]+$/;
const SAFE_EXT = /^[A-Za-z0-9]+$/;

export type BuildKeyArgs = {
  env: AssetEnv;
  scope: AssetScope;
  assetKind: AssetKind;
  id: string;
  ext: string;
};

export function buildKey(args: BuildKeyArgs): string {
  if (!SAFE_TOKEN.test(args.id)) {
    throw new Error(`invalid id: ${args.id}`);
  }
  const ext = normaliseExt(args.ext);
  if (ext === null || !SAFE_EXT.test(ext)) {
    throw new Error(`invalid extension: ${args.ext}`);
  }
  const scopeSegment =
    args.scope.kind === "global" ? "global" : `brand-${args.scope.brandId}`;
  if (args.scope.kind === "brand" && !SAFE_TOKEN.test(args.scope.brandId)) {
    throw new Error(`invalid brandId: ${args.scope.brandId}`);
  }
  return `${args.env}/${scopeSegment}/${args.assetKind}/${args.id}.${ext}`;
}

export function parseKey(key: string): BuildKeyArgs | null {
  const parts = key.split("/");
  if (parts.length !== 4) return null;
  const [env, scopePart, assetKind, last] = parts;
  if (!ASSET_ENVS.includes(env as AssetEnv)) return null;
  if (!ASSET_KINDS.includes(assetKind as AssetKind)) return null;
  const dot = last.lastIndexOf(".");
  if (dot <= 0 || dot === last.length - 1) return null;
  const id = last.slice(0, dot);
  const ext = last.slice(dot + 1);
  if (!SAFE_TOKEN.test(id) || !SAFE_EXT.test(ext)) return null;

  let scope: AssetScope;
  if (scopePart === "global") {
    scope = { kind: "global" };
  } else if (scopePart.startsWith("brand-")) {
    const brandId = scopePart.slice("brand-".length);
    if (!SAFE_TOKEN.test(brandId)) return null;
    scope = { kind: "brand", brandId };
  } else {
    return null;
  }

  return {
    env: env as AssetEnv,
    scope,
    assetKind: assetKind as AssetKind,
    id,
    ext,
  };
}

export function normaliseExt(raw: string): string | null {
  const trimmed = raw.startsWith(".") ? raw.slice(1) : raw;
  if (trimmed.length === 0) return null;
  return trimmed.toLowerCase();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test lib/r2/keys.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/r2/keys.ts lib/r2/keys.test.ts
git commit -m "feat(r2): add pure key builder and parser"
```

---

## Task 3: MIME / extension allowlist (pure)

**Files:**
- Create: `lib/r2/mime.ts`
- Create: `lib/r2/mime.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/r2/mime.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  ALLOWED_EXTENSIONS,
  isAllowedExt,
  mimeForExt,
  inferKindFromMime,
} from "./mime";

describe("ALLOWED_EXTENSIONS", () => {
  it("covers the documented set", () => {
    expect(new Set(ALLOWED_EXTENSIONS)).toEqual(
      new Set(["mp4", "mov", "webm", "png", "jpg", "jpeg", "gif", "webp"]),
    );
  });
});

describe("isAllowedExt", () => {
  it("accepts allowlisted extensions case-insensitively", () => {
    expect(isAllowedExt("mp4")).toBe(true);
    expect(isAllowedExt(".MP4")).toBe(true);
    expect(isAllowedExt("PNG")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isAllowedExt("exe")).toBe(false);
    expect(isAllowedExt("")).toBe(false);
    expect(isAllowedExt("svg")).toBe(false);
  });
});

describe("mimeForExt", () => {
  it("returns the correct mime for video", () => {
    expect(mimeForExt("mp4")).toBe("video/mp4");
    expect(mimeForExt("mov")).toBe("video/quicktime");
    expect(mimeForExt("webm")).toBe("video/webm");
  });

  it("returns the correct mime for images", () => {
    expect(mimeForExt("png")).toBe("image/png");
    expect(mimeForExt("jpg")).toBe("image/jpeg");
    expect(mimeForExt("jpeg")).toBe("image/jpeg");
    expect(mimeForExt("gif")).toBe("image/gif");
    expect(mimeForExt("webp")).toBe("image/webp");
  });

  it("returns null for disallowed extensions", () => {
    expect(mimeForExt("exe")).toBeNull();
  });
});

describe("inferKindFromMime", () => {
  it("classifies images and videos", () => {
    expect(inferKindFromMime("image/png")).toBe("image");
    expect(inferKindFromMime("video/mp4")).toBe("video");
  });

  it("returns null for anything else", () => {
    expect(inferKindFromMime("application/pdf")).toBeNull();
    expect(inferKindFromMime("")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test lib/r2/mime.test.ts`
Expected: FAIL — module `./mime` not found.

- [ ] **Step 3: Implement `lib/r2/mime.ts`**

```ts
// Allowlist of extensions that can land in R2, plus mime helpers used by the
// upload / read paths. Anything not in this list is rejected at upload time.

import { normaliseExt } from "./keys";

export const ALLOWED_EXTENSIONS = [
  "mp4",
  "mov",
  "webm",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
] as const;

export type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];

const EXT_TO_MIME: Record<AllowedExtension, string> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
};

export function isAllowedExt(raw: string): boolean {
  const ext = normaliseExt(raw);
  if (ext === null) return false;
  return (ALLOWED_EXTENSIONS as readonly string[]).includes(ext);
}

export function mimeForExt(raw: string): string | null {
  const ext = normaliseExt(raw);
  if (ext === null) return null;
  if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(ext)) return null;
  return EXT_TO_MIME[ext as AllowedExtension];
}

export type MediaKind = "image" | "video";

export function inferKindFromMime(mime: string): MediaKind | null {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test lib/r2/mime.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/r2/mime.ts lib/r2/mime.test.ts
git commit -m "feat(r2): add extension allowlist and mime helpers"
```

---

## Task 4: Tier-based retention helper

**Files:**
- Modify: `lib/billing/tiers.ts`
- Modify: `lib/billing/tiers.test.ts`
- Create: `lib/r2/retention.ts`
- Create: `lib/r2/retention.test.ts`

- [ ] **Step 1: Add retention map to `lib/billing/tiers.ts`**

Edit `lib/billing/tiers.ts` — append after `assertBrandQuotaOk`:

```ts
// Days that user-uploaded media is retained before the nightly cleanup
// purges it. premade / ai-images / renders / brand-assets are never expired
// and live with `expiresAt: null` — they don't appear in this map.
export const UPLOAD_RETENTION_DAYS_BY_TIER = {
  free: 7,
  pro: 90,
  agency: 365,
} as const satisfies Record<Tier, number>;
```

- [ ] **Step 2: Cover the new constant in `lib/billing/tiers.test.ts`**

Append to `lib/billing/tiers.test.ts`:

```ts
import { UPLOAD_RETENTION_DAYS_BY_TIER } from "./tiers";

describe("UPLOAD_RETENTION_DAYS_BY_TIER", () => {
  it("matches the published retention table", () => {
    expect(UPLOAD_RETENTION_DAYS_BY_TIER).toEqual({
      free: 7,
      pro: 90,
      agency: 365,
    });
  });
});
```

If the existing test file uses a single top-level `import` block, add `UPLOAD_RETENTION_DAYS_BY_TIER` to that import instead of writing a second `import` line.

- [ ] **Step 3: Run tier tests**

Run: `pnpm test lib/billing/tiers.test.ts`
Expected: pass.

- [ ] **Step 4: Write the failing test for retention helper**

Create `lib/r2/retention.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { expiresAtFor } from "./retention";

const NOW = Date.UTC(2026, 4, 5, 12, 0, 0); // 2026-05-05 12:00:00Z
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

describe("expiresAtFor", () => {
  it("returns null for sources that never expire", () => {
    for (const source of ["premade", "ai-images", "renders", "brand-assets"] as const) {
      expect(expiresAtFor(source, "free", NOW)).toBeNull();
      expect(expiresAtFor(source, "pro", NOW)).toBeNull();
      expect(expiresAtFor(source, "agency", NOW)).toBeNull();
    }
  });

  it("computes expiry from now + tier days for uploads", () => {
    expect(expiresAtFor("uploads", "free", NOW)).toBe(NOW + 7 * ONE_DAY_MS);
    expect(expiresAtFor("uploads", "pro", NOW)).toBe(NOW + 90 * ONE_DAY_MS);
    expect(expiresAtFor("uploads", "agency", NOW)).toBe(NOW + 365 * ONE_DAY_MS);
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `pnpm test lib/r2/retention.test.ts`
Expected: FAIL — module `./retention` not found.

- [ ] **Step 6: Implement `lib/r2/retention.ts`**

```ts
// Tier-based retention for user uploads. Pure. The cleanup cron reads
// `expiresAt` from each row; this is where that value is computed at write
// time. premade / ai-images / renders / brand-assets always live forever.

import { type Tier, UPLOAD_RETENTION_DAYS_BY_TIER } from "../billing/tiers";
import type { AssetKind } from "./keys";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function expiresAtFor(
  source: AssetKind,
  tier: Tier,
  now: number,
): number | null {
  if (source !== "uploads") return null;
  return now + UPLOAD_RETENTION_DAYS_BY_TIER[tier] * ONE_DAY_MS;
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `pnpm test lib/r2/retention.test.ts`
Expected: pass.

- [ ] **Step 8: Commit**

```bash
git add lib/billing/tiers.ts lib/billing/tiers.test.ts lib/r2/retention.ts lib/r2/retention.test.ts
git commit -m "feat(r2): add tier-based upload retention helper"
```

---

## Task 5: R2 config reader

**Files:**
- Create: `lib/r2/config.ts`
- Create: `lib/r2/config.test.ts`
- Modify: `.env.local` — only if you (the implementer) have completed Pre-flight step 1; otherwise leave alone and continue.

- [ ] **Step 1: Write the failing test**

Create `lib/r2/config.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getR2Config } from "./config";

const COMPLETE_ENV = {
  R2_ACCOUNT_ID: "acct123",
  R2_ACCESS_KEY_ID: "AKIA",
  R2_SECRET_ACCESS_KEY: "secret",
  R2_BUCKET: "omnigrowth-media-dev",
  R2_ENDPOINT: "https://acct123.r2.cloudflarestorage.com",
  NEXT_PUBLIC_APP_ENV: "dev",
} as const;

beforeEach(() => {
  for (const k of Object.keys(COMPLETE_ENV)) vi.stubEnv(k, "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getR2Config", () => {
  it("returns the config when all envs are set", () => {
    for (const [k, v] of Object.entries(COMPLETE_ENV)) vi.stubEnv(k, v);
    expect(getR2Config()).toEqual({
      env: "dev",
      bucket: "omnigrowth-media-dev",
      endpoint: "https://acct123.r2.cloudflarestorage.com",
      accessKeyId: "AKIA",
      secretAccessKey: "secret",
      accountId: "acct123",
    });
  });

  it("throws a clear error listing missing envs", () => {
    for (const [k, v] of Object.entries(COMPLETE_ENV)) vi.stubEnv(k, v);
    vi.stubEnv("R2_BUCKET", "");
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "");
    expect(() => getR2Config()).toThrowError(/R2_BUCKET.*R2_SECRET_ACCESS_KEY|R2_SECRET_ACCESS_KEY.*R2_BUCKET/);
  });

  it("defaults env to 'dev' when NEXT_PUBLIC_APP_ENV is missing", () => {
    for (const [k, v] of Object.entries(COMPLETE_ENV)) vi.stubEnv(k, v);
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "");
    expect(getR2Config().env).toBe("dev");
  });

  it("accepts 'prod' as a value", () => {
    for (const [k, v] of Object.entries(COMPLETE_ENV)) vi.stubEnv(k, v);
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "prod");
    expect(getR2Config().env).toBe("prod");
  });

  it("rejects an unknown NEXT_PUBLIC_APP_ENV", () => {
    for (const [k, v] of Object.entries(COMPLETE_ENV)) vi.stubEnv(k, v);
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "staging");
    expect(() => getR2Config()).toThrowError(/NEXT_PUBLIC_APP_ENV/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test lib/r2/config.test.ts`
Expected: FAIL — module `./config` not found.

- [ ] **Step 3: Implement `lib/r2/config.ts`**

```ts
// Reads R2 envs and exposes them as a typed object. Throws clearly if any
// required env is missing — the alternative (a confusing AccessDenied at S3
// PUT time) is much worse.

import type { AssetEnv } from "./keys";

export type R2Config = {
  env: AssetEnv;
  bucket: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  accountId: string;
};

const REQUIRED_KEYS = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_ENDPOINT",
] as const;

export function getR2Config(): R2Config {
  const missing = REQUIRED_KEYS.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(
      `R2 config is missing the following env vars: ${missing.join(", ")}. See docs/superpowers/plans/2026-05-05-r2-media-library-foundation.md Pre-flight step 1.`,
    );
  }
  const rawEnv = process.env.NEXT_PUBLIC_APP_ENV ?? "dev";
  if (rawEnv !== "dev" && rawEnv !== "prod") {
    throw new Error(
      `NEXT_PUBLIC_APP_ENV must be "dev" or "prod"; got "${rawEnv}".`,
    );
  }
  return {
    env: rawEnv,
    bucket: process.env.R2_BUCKET as string,
    endpoint: process.env.R2_ENDPOINT as string,
    accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
    accountId: process.env.R2_ACCOUNT_ID as string,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test lib/r2/config.test.ts`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add lib/r2/config.ts lib/r2/config.test.ts
git commit -m "feat(r2): add typed config reader with clear missing-env errors"
```

---

## Task 6: S3 client wrapper (Node-only)

**Files:**
- Create: `lib/r2/client.ts`

> No unit test in this task — Vitest's edge-runtime can't load `@aws-sdk/client-s3`. The wrapper is small and is exercised by manual smoke tests in Task 14.

- [ ] **Step 1: Implement `lib/r2/client.ts`**

```ts
// S3 client wrapper for Cloudflare R2. Node-only — DO NOT import this from
// Convex queries or mutations (V8 runtime). Only Convex actions with
// `"use node";` and the future render worker / admin CLI may import this.
//
// AWS SDK v3 + R2 surface verified via Context7 on 2026-05-05:
// - region: "auto" (R2 ignores the value but the SDK requires one)
// - endpoint: <https://ACCOUNT_ID.r2.cloudflarestorage.com>
// - forcePathStyle: false (R2's S3 endpoint is virtual-hosted-style)

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Config, type R2Config } from "./config";

let cached: { client: S3Client; config: R2Config } | null = null;

function getClient(): { client: S3Client; config: R2Config } {
  if (cached !== null) return cached;
  const config = getR2Config();
  const client = new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    forcePathStyle: false,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  cached = { client, config };
  return cached;
}

const PUT_TTL_SECONDS = 15 * 60; // 15 minutes
const GET_TTL_SECONDS = 24 * 60 * 60; // 24 hours

export async function presignPut(args: {
  key: string;
  contentType: string;
}): Promise<string> {
  const { client, config } = getClient();
  return getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: args.key,
      ContentType: args.contentType,
    }),
    { expiresIn: PUT_TTL_SECONDS },
  );
}

export async function presignGet(args: { key: string }): Promise<string> {
  const { client, config } = getClient();
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: config.bucket, Key: args.key }),
    { expiresIn: GET_TTL_SECONDS },
  );
}

export async function deleteObject(args: { key: string }): Promise<void> {
  const { client, config } = getClient();
  await client.send(
    new DeleteObjectCommand({ Bucket: config.bucket, Key: args.key }),
  );
}

export async function headObject(args: {
  key: string;
}): Promise<{ size: number; contentType: string | null } | null> {
  const { client, config } = getClient();
  try {
    const out = await client.send(
      new HeadObjectCommand({ Bucket: config.bucket, Key: args.key }),
    );
    return {
      size: out.ContentLength ?? 0,
      contentType: out.ContentType ?? null,
    };
  } catch (err) {
    // SDK throws NotFound for 404 — surface as null instead of bubbling so
    // callers don't conflate "object missing" with infrastructure failure.
    if ((err as { name?: string }).name === "NotFound") return null;
    throw err;
  }
}
```

- [ ] **Step 2: Confirm typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/r2/client.ts
git commit -m "feat(r2): add S3 client wrapper with presigned URL helpers"
```

---

## Task 7: media_assets schema

**Files:**
- Create: `features/media-library/schema.ts`
- Create: `features/media-library/feature.config.ts`
- Create: `features/media-library/README.md`
- Modify: `convex/schema.ts`

- [ ] **Step 1: Implement `features/media-library/schema.ts`**

```ts
// media_assets is the metadata table for every binary stored in R2. The bytes
// live exclusively in R2; this table holds the object key plus enough info
// to (a) display thumbnails / list rows, (b) authorize access, and (c) drive
// the retention cleanup cron.
//
// brandId is the security boundary for user-owned content. global-scope rows
// (premade catalog) carry brandId === null; the read path never returns
// other-user assets.
//
// Indexes:
// - by_brand_created — list a brand's assets, newest first.
// - by_expires — cleanup cron scans rows whose expiresAt <= now.
// - by_key — uniqueness check + reverse lookup from R2 → Convex during
//   admin/maintenance ops.

import { defineTable } from "convex/server";
import { v } from "convex/values";

export const mediaLibrarySchema = {
  media_assets: defineTable({
    // Owner. null = global (premade catalog), seeded by admin only.
    brandId: v.union(v.id("brand_profiles"), v.null()),

    // R2 key — the canonical identifier. Built by lib/r2/keys.ts buildKey().
    key: v.string(),

    // Discriminator that matches the AssetKind type in lib/r2/keys.ts.
    source: v.union(
      v.literal("uploads"),
      v.literal("premade"),
      v.literal("ai-images"),
      v.literal("renders"),
      v.literal("brand-assets"),
    ),

    // image | video — mirrors lib/r2/mime.ts MediaKind. Drives UI (img vs
    // video tag).
    kind: v.union(v.literal("image"), v.literal("video")),

    contentType: v.string(), // e.g. "video/mp4"
    sizeBytes: v.number(),
    originalFilename: v.optional(v.string()),

    // null for never-expire (premade / ai-images / renders / brand-assets).
    expiresAt: v.union(v.number(), v.null()),

    createdAt: v.number(),
  })
    .index("by_brand_created", ["brandId", "createdAt"])
    .index("by_expires", ["expiresAt"])
    .index("by_key", ["key"]),
} as const;
```

- [ ] **Step 2: Implement `features/media-library/feature.config.ts`**

```ts
export const featureConfig = {
  name: "media-library",
  version: "0.1.0",
  enabled: true,
  dependencies: ["auth", "brand-profile"] as const,
} as const;
```

- [ ] **Step 3: Implement `features/media-library/README.md`**

```md
# media-library

Centralizes binary media: uploads, AI-generated outputs, render outputs, and the premade clip catalog. Bytes live in Cloudflare R2 (private bucket, signed URLs only); Convex stores the metadata row.

Spec: `docs/features/media-library.md`
v1 plan: `docs/superpowers/plans/2026-05-05-r2-media-library-foundation.md`
```

- [ ] **Step 4: Wire schema into `convex/schema.ts`**

Edit `convex/schema.ts`:

```ts
// Composes per-feature schema fragments. See docs/architecture.md.
// Each feature owns its own tables under features/<name>/schema.ts.

import { analyticsSchema } from "@/features/analytics/schema";
import { brandProfileSchema } from "@/features/brand-profile/schema";
import { calendarSchema } from "@/features/calendar/schema";
import { dashboardSchema } from "@/features/dashboard/schema";
import { landingSchema } from "@/features/landing/schema";
import { mediaLibrarySchema } from "@/features/media-library/schema";
import { postGeneratorSchema } from "@/features/post-generator/schema";
import { defineSchema } from "convex/server";
import { sharedSchema } from "./shared/schema";

export default defineSchema({
  ...sharedSchema,
  ...landingSchema,
  ...brandProfileSchema,
  ...dashboardSchema,
  ...mediaLibrarySchema,
  ...postGeneratorSchema,
  ...calendarSchema,
  ...analyticsSchema,
});
```

- [ ] **Step 5: Push schema to Convex dev**

Run: `npx convex dev --once`
Expected: schema diff applies cleanly. New `media_assets` table appears in the dashboard.

- [ ] **Step 6: Confirm typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add features/media-library/ convex/schema.ts
git commit -m "feat(media-library): add media_assets schema and feature scaffold"
```

---

## Task 8: list + get queries

**Files:**
- Create: `convex/mediaLibrary/assets.ts`
- Create: `convex/mediaLibrary/assets.test.ts`

> Reuses the convex-test glob-rewriting pattern from `convex/brandProfile/brands.test.ts`. If a third feature adds a `convex/<X>/Y.test.ts`, extract the helper to `convex/test-utils.ts` per the TODO already noted in `convex/brandProfile/brands.test.ts:21`.

- [ ] **Step 1: Write the failing tests**

Create `convex/mediaLibrary/assets.test.ts`:

```ts
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
  return t.run(async (ctx) =>
    ctx.db.insert("users", { email, tier: "free" }),
  );
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test convex/mediaLibrary/assets.test.ts`
Expected: FAIL — `api.mediaLibrary.assets.list` not defined.

- [ ] **Step 3: Implement `convex/mediaLibrary/assets.ts` (queries only)**

```ts
// Media-library queries and mutations. V8 runtime — no R2 imports here.
// Anything that needs to talk to R2 lives in convex/mediaLibrary/presign.ts
// (Node runtime, "use node";).
//
// Brand ownership is verified in every public function. Probe-by-id reads
// (get) return null on missing/unowned/unauthenticated to avoid existence
// leaks; mutations and list throw ConvexError NOT_FOUND for the same
// conditions, matching the convention set by convex/brandProfile/brands.ts.

import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

async function loadOwnedBrand(
  ctx: { db: { get: (id: Id<"brand_profiles">) => Promise<Doc<"brand_profiles"> | null> } },
  userId: Id<"users">,
  brandId: Id<"brand_profiles">,
): Promise<Doc<"brand_profiles">> {
  const brand = await ctx.db.get(brandId);
  if (brand === null || brand.userId !== userId) {
    throw new ConvexError({ code: "NOT_FOUND" });
  }
  return brand;
}

export const list = query({
  args: { brandId: v.id("brand_profiles") },
  handler: async (ctx, { brandId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError({ code: "UNAUTHENTICATED" });
    }
    await loadOwnedBrand(ctx, userId, brandId);
    return await ctx.db
      .query("media_assets")
      .withIndex("by_brand_created", (q) => q.eq("brandId", brandId))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { assetId: v.id("media_assets") },
  handler: async (ctx, { assetId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const asset = await ctx.db.get(assetId);
    if (asset === null) return null;
    if (asset.brandId === null) return null; // global premade — not exposed via get
    const brand = await ctx.db.get(asset.brandId);
    if (brand === null || brand.userId !== userId) return null;
    return asset;
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test convex/mediaLibrary/assets.test.ts`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add convex/mediaLibrary/assets.ts convex/mediaLibrary/assets.test.ts
git commit -m "feat(media-library): list + get queries with brand ownership checks"
```

---

## Task 9: recordUpload + remove mutations

**Files:**
- Modify: `convex/mediaLibrary/assets.ts`
- Modify: `convex/mediaLibrary/assets.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `convex/mediaLibrary/assets.test.ts`:

```ts
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
  it("deletes the row when the caller owns the brand", async () => {
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
    expect(stored).toBeNull();
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test convex/mediaLibrary/assets.test.ts`
Expected: FAIL — `recordUpload` and `remove` not defined.

- [ ] **Step 3: Extend `convex/mediaLibrary/assets.ts`**

Append to `convex/mediaLibrary/assets.ts`:

```ts
import { mimeForExt, inferKindFromMime } from "../../lib/r2/mime";
import { expiresAtFor } from "../../lib/r2/retention";

export const recordUpload = mutation({
  args: {
    brandId: v.id("brand_profiles"),
    key: v.string(),
    contentType: v.string(),
    sizeBytes: v.number(),
    originalFilename: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError({ code: "UNAUTHENTICATED" });
    }
    const user = await ctx.db.get(userId);
    if (user === null) {
      throw new ConvexError({ code: "INTERNAL", reason: "user_row_missing" });
    }
    await loadOwnedBrand(ctx, userId, args.brandId);

    const kind = inferKindFromMime(args.contentType);
    if (kind === null) {
      throw new ConvexError({ code: "INVALID_CONTENT_TYPE" });
    }

    const now = Date.now();
    return await ctx.db.insert("media_assets", {
      brandId: args.brandId,
      key: args.key,
      source: "uploads",
      kind,
      contentType: args.contentType,
      sizeBytes: args.sizeBytes,
      originalFilename: args.originalFilename,
      // No `as Tier` cast: schema's tier union matches Tier exactly. If a
      // tier is added to the schema but not to UPLOAD_RETENTION_DAYS_BY_TIER,
      // we want TypeScript to catch it here.
      expiresAt: expiresAtFor("uploads", user.tier, now),
      createdAt: now,
    });
  },
});

export const remove = mutation({
  args: { assetId: v.id("media_assets") },
  handler: async (ctx, { assetId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError({ code: "UNAUTHENTICATED" });
    }
    const asset = await ctx.db.get(assetId);
    if (asset === null) {
      throw new ConvexError({ code: "NOT_FOUND" });
    }
    if (asset.brandId === null) {
      // Global / premade rows can only be removed by an admin script.
      throw new ConvexError({ code: "NOT_FOUND" });
    }
    await loadOwnedBrand(ctx, userId, asset.brandId);
    // Important: this only deletes the metadata row. The R2 object is
    // deleted by the cleanup cron, which scans by `expiresAt`. To make
    // remove() also drop the R2 object immediately, we'd need an action
    // wrapper (Node runtime). Acceptable for v1: the orphan is tiny and
    // the cron will reap it on the next pass. Document and revisit if the
    // delete-now requirement appears.
    await ctx.db.delete(assetId);
  },
});
```

> **Caveat noted explicitly:** the `remove` mutation deletes only the Convex row. The R2 object is reclaimed by the cleanup cron on its next pass *only if* the row had an `expiresAt`. For never-expiring rows (premade, ai-images, renders, brand-assets), a future task needs to add an action-based "remove + purge" wrapper. v1 doesn't surface remove for those kinds, so this is acceptable.

> Update the `remove` handler so the cleanup cron actually catches user-upload deletes too. Modify the deletion path: instead of `ctx.db.delete(assetId)`, patch the row with `expiresAt: 0` (already-expired). The cron then reaps it on the next pass. Add a follow-up Coda row to replace this with an action-driven immediate purge once an action wrapper exists.

Replace `await ctx.db.delete(assetId);` in the `remove` handler with:

```ts
    await ctx.db.patch(assetId, { expiresAt: 0 });
```

And update the **first** test in the `remove` describe block to match the new behavior:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test convex/mediaLibrary/assets.test.ts`
Expected: all tests pass (including the rewritten remove test).

- [ ] **Step 5: Commit**

```bash
git add convex/mediaLibrary/assets.ts convex/mediaLibrary/assets.test.ts
git commit -m "feat(media-library): recordUpload mutation + tombstone remove"
```

---

## Task 10: presignUpload + presignRead actions

**Files:**
- Create: `convex/mediaLibrary/presign.ts`

> No convex-test coverage — Node runtime can't run inside `edge-runtime`. Manual smoke test in Task 14 exercises this.

- [ ] **Step 1: Implement `convex/mediaLibrary/presign.ts`**

```ts
"use node";

// Node-runtime actions that call into lib/r2/client.ts to mint signed URLs.
// The two flows:
//
// 1. Upload (browser → R2):
//    - Browser calls presignUpload({ brandId, originalFilename, contentType, sizeBytes }).
//    - Action validates ownership of brandId, validates contentType is in
//      the mime allowlist, builds a key via lib/r2/keys.ts, returns
//      { uploadUrl, key, contentType }.
//    - Browser PUTs the file to uploadUrl with the same Content-Type header.
//    - On 200, browser calls api.mediaLibrary.assets.recordUpload to insert
//      the metadata row.
//
// 2. Read (browser ← R2):
//    - Browser calls presignRead({ assetId }).
//    - Action verifies ownership via api.mediaLibrary.assets.get and returns
//      a 24h signed GET URL.
//
// Auth: getAuthUserId is available inside actions via the same import. The
// action validates ownership BEFORE producing the key / URL — never the other
// way around. The S3 layer has no auth context.

import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { buildKey, normaliseExt, type AssetEnv } from "../../lib/r2/keys";
import { isAllowedExt, mimeForExt } from "../../lib/r2/mime";
import { presignGet, presignPut } from "../../lib/r2/client";

const MAX_UPLOAD_BYTES = 200 * 1024 * 1024; // 200 MB hard cap for v1

function getEnv(): AssetEnv {
  const raw = process.env.NEXT_PUBLIC_APP_ENV ?? "dev";
  if (raw !== "dev" && raw !== "prod") {
    throw new ConvexError({ code: "INTERNAL", reason: "bad_env" });
  }
  return raw;
}

function makeNanoid(): string {
  // Convex's runtime has crypto.randomUUID. We strip dashes for a key-safe
  // string. Length = 32 chars, plenty of entropy. We avoid pulling in nanoid
  // to keep zero new transitive deps.
  return crypto.randomUUID().replace(/-/g, "");
}

export const presignUpload = action({
  args: {
    brandId: v.id("brand_profiles"),
    originalFilename: v.string(),
    contentType: v.string(),
    sizeBytes: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError({ code: "UNAUTHENTICATED" });
    }

    if (args.sizeBytes <= 0 || args.sizeBytes > MAX_UPLOAD_BYTES) {
      throw new ConvexError({ code: "FILE_TOO_LARGE", limit: MAX_UPLOAD_BYTES });
    }

    // Validate the content type via the allowlist. The `contentType` the
    // browser declares is what we'll sign — and what S3 will require on the
    // PUT. We don't trust the file extension; we trust the mime.
    if (mimeForExt(extFromMime(args.contentType)) === null) {
      throw new ConvexError({ code: "INVALID_CONTENT_TYPE" });
    }

    // Brand ownership — call the existing query. fetchQuery-style internal
    // calls inside an action use ctx.runQuery.
    const brand = await ctx.runQuery(api.brandProfile.brands.get, {
      brandId: args.brandId,
    });
    if (brand === null) {
      throw new ConvexError({ code: "NOT_FOUND" });
    }

    // Pick the extension from the mime, not from the filename — defensive.
    const ext = extFromMime(args.contentType);
    if (ext === null || !isAllowedExt(ext)) {
      throw new ConvexError({ code: "INVALID_CONTENT_TYPE" });
    }

    const id = makeNanoid();
    const key = buildKey({
      env: getEnv(),
      scope: { kind: "brand", brandId: args.brandId },
      assetKind: "uploads",
      id,
      ext,
    });

    const uploadUrl = await presignPut({
      key,
      contentType: args.contentType,
    });

    return { uploadUrl, key, contentType: args.contentType };
  },
});

export const presignRead = action({
  args: { assetId: v.id("media_assets") },
  handler: async (ctx, { assetId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError({ code: "UNAUTHENTICATED" });
    }
    const asset = await ctx.runQuery(api.mediaLibrary.assets.get, { assetId });
    if (asset === null) {
      throw new ConvexError({ code: "NOT_FOUND" });
    }
    const url = await presignGet({ key: asset.key });
    return { url, expiresInSeconds: 24 * 60 * 60 };
  },
});

// Maps a content type back to the extension used in the R2 key. We
// intentionally don't trust the original filename's extension — the mime
// is what S3 sees on PUT. mp3-disguised-as-mp4 is out of scope for v1.
function extFromMime(contentType: string): string | null {
  switch (contentType) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/gif":
      return "gif";
    case "image/webp":
      return "webp";
    case "video/mp4":
      return "mp4";
    case "video/quicktime":
      return "mov";
    case "video/webm":
      return "webm";
    default:
      return null;
  }
}
```

- [ ] **Step 2: Confirm typecheck**

Run: `pnpm typecheck`
Expected: no errors. The `"use node";` directive is recognized.

- [ ] **Step 3: Push to Convex dev**

Run: `npx convex dev --once`
Expected: `presignUpload` and `presignRead` registered as Node-runtime actions in the dashboard.

- [ ] **Step 4: Commit**

```bash
git add convex/mediaLibrary/presign.ts
git commit -m "feat(media-library): presigned upload + read actions"
```

---

## Task 11: Cleanup action

**Files:**
- Create: `convex/mediaLibrary/cleanup.ts`

- [ ] **Step 1: Implement `convex/mediaLibrary/cleanup.ts`**

```ts
"use node";

// Daily scheduled action: scan media_assets for rows whose expiresAt <= now,
// delete the R2 object, then delete the Convex row. Runs as an internalAction
// so only the cron (or another internal Convex function) can invoke it.
//
// Failure modes handled:
// - R2 object already missing → log + delete the row anyway (orphan reaper).
// - R2 delete throws something other than NotFound → leave the row, surface
//   the error, the next run retries.

import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { deleteObject, headObject } from "../../lib/r2/client";

const BATCH_SIZE = 100;

export const _listExpired = internalQuery({
  args: { now: v.number(), limit: v.number() },
  handler: async (ctx, { now, limit }) => {
    return await ctx.db
      .query("media_assets")
      .withIndex("by_expires", (q) => q.lte("expiresAt", now))
      .take(limit);
  },
});

export const _deleteRow = internalMutation({
  args: { assetId: v.id("media_assets") },
  handler: async (ctx, { assetId }) => {
    await ctx.db.delete(assetId);
  },
});

export const purgeExpired = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.runQuery(internal.mediaLibrary.cleanup._listExpired, {
      now,
      limit: BATCH_SIZE,
    });

    let deleted = 0;
    let failed = 0;
    for (const row of expired) {
      // expiresAt === null rows would never appear (the index filter is
      // <= now and null is excluded), but defensive in case the index
      // semantics change.
      if (row.expiresAt === null) continue;
      try {
        // headObject is best-effort — if the object isn't there, the R2
        // delete is a no-op anyway. We call it primarily so we can log
        // sensible diagnostics if the byte size is wildly off (unused
        // here but cheap to keep — drop if observability arrives later).
        await headObject({ key: row.key });
        await deleteObject({ key: row.key });
      } catch (err) {
        console.error(`[r2-cleanup] failed to delete ${row.key}`, err);
        failed += 1;
        continue;
      }
      await ctx.runMutation(internal.mediaLibrary.cleanup._deleteRow, {
        assetId: row._id as Id<"media_assets">,
      });
      deleted += 1;
    }

    return { scanned: expired.length, deleted, failed };
  },
});
```

- [ ] **Step 2: Push and confirm registration**

Run: `npx convex dev --once`
Expected: three new functions show up — `mediaLibrary.cleanup._listExpired`, `mediaLibrary.cleanup._deleteRow`, `mediaLibrary.cleanup.purgeExpired`.

- [ ] **Step 3: Commit**

```bash
git add convex/mediaLibrary/cleanup.ts
git commit -m "feat(media-library): cleanup action for expired R2 assets"
```

---

## Task 12: Cron registration

**Files:**
- Create: `convex/crons.ts`

- [ ] **Step 1: Implement `convex/crons.ts`**

```ts
// Scheduled functions registry. Convex picks this up automatically by name —
// the file MUST be named `convex/crons.ts` (or .js). See
// docs.convex.dev/scheduling/cron-jobs.

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Daily at 03:00 UTC. Picks a low-traffic window; tweak if user-region
// concentration shifts.
crons.cron(
  "media-library: purge expired R2 assets",
  "0 3 * * *",
  internal.mediaLibrary.cleanup.purgeExpired,
);

export default crons;
```

- [ ] **Step 2: Push and confirm**

Run: `npx convex dev --once`
Expected: the cron appears in the Convex dashboard under "Cron Jobs" with the schedule `0 3 * * *`.

- [ ] **Step 3: Commit**

```bash
git add convex/crons.ts
git commit -m "feat(media-library): daily cron for R2 retention cleanup"
```

---

## Task 13: MediaUploader component

**Files:**
- Create: `features/media-library/components/MediaUploader.tsx`

- [ ] **Step 1: Implement `MediaUploader.tsx`**

```tsx
"use client";

// Minimal uploader. Single file at a time; no drag-and-drop polish, no
// progress bar yet — both land in the design follow-up. The point is to
// prove the pipe: file picker → presignUpload → PUT → recordUpload.

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAction, useMutation } from "convex/react";
import { useState } from "react";

type Props = { brandId: Id<"brand_profiles"> };

type Status =
  | { kind: "idle" }
  | { kind: "uploading"; filename: string }
  | { kind: "error"; message: string }
  | { kind: "success"; filename: string };

const ALLOWED_MIMES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/webm",
] as const;

export function MediaUploader({ brandId }: Props) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const presignUpload = useAction(api.mediaLibrary.presign.presignUpload);
  const recordUpload = useMutation(api.mediaLibrary.assets.recordUpload);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!(ALLOWED_MIMES as readonly string[]).includes(file.type)) {
      setStatus({ kind: "error", message: `Unsupported file type: ${file.type || "unknown"}` });
      return;
    }

    setStatus({ kind: "uploading", filename: file.name });
    try {
      const { uploadUrl, key, contentType } = await presignUpload({
        brandId,
        originalFilename: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      });

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: file,
      });
      if (!putRes.ok) {
        throw new Error(`R2 PUT failed: ${putRes.status} ${putRes.statusText}`);
      }

      await recordUpload({
        brandId,
        key,
        contentType,
        sizeBytes: file.size,
        originalFilename: file.name,
      });

      setStatus({ kind: "success", filename: file.name });
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Upload failed",
      });
    } finally {
      // Allow re-uploading the same file (input keeps last selection).
      e.target.value = "";
    }
  }

  return (
    <div className="card">
      <label className="btn">
        <input
          type="file"
          accept={ALLOWED_MIMES.join(",")}
          onChange={onFile}
          className="hidden"
        />
        Upload media
      </label>
      <div className="caption mt-8">
        {status.kind === "idle" && "Pick an image or video."}
        {status.kind === "uploading" && `Uploading ${status.filename}…`}
        {status.kind === "success" && `Uploaded ${status.filename}.`}
        {status.kind === "error" && `Error: ${status.message}`}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Confirm typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add features/media-library/components/MediaUploader.tsx
git commit -m "feat(media-library): minimal uploader component"
```

---

## Task 14: MediaGrid component

**Files:**
- Create: `features/media-library/components/MediaGrid.tsx`

- [ ] **Step 1: Implement `MediaGrid.tsx`**

```tsx
"use client";

// Renders the brand's media as a responsive thumbnail grid. Each tile
// fetches its own short-lived signed URL via presignRead. URLs are cached in
// component state and re-fetched if the user keeps the tab open beyond the
// 24h TTL (refresh-on-render is fine for v1; a dedicated "URL expired"
// detector lands when we actually hit the case).

import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useAction, useQuery } from "convex/react";
import { useEffect, useState } from "react";

type Props = { brandId: Id<"brand_profiles"> };

export function MediaGrid({ brandId }: Props) {
  const assets = useQuery(api.mediaLibrary.assets.list, { brandId });

  if (assets === undefined) {
    return <div className="caption">Loading media…</div>;
  }
  if (assets.length === 0) {
    return <div className="caption">No media yet. Upload one above.</div>;
  }

  return (
    <div className="grid-4 mt-16">
      {assets.map((asset) => (
        <MediaTile key={asset._id} asset={asset} />
      ))}
    </div>
  );
}

function MediaTile({ asset }: { asset: Doc<"media_assets"> }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const presignRead = useAction(api.mediaLibrary.presign.presignRead);

  useEffect(() => {
    let cancelled = false;
    presignRead({ assetId: asset._id })
      .then(({ url }) => {
        if (!cancelled) setUrl(url);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [asset._id, presignRead]);

  return (
    <div className="card">
      {error !== null && <div className="caption">Error: {error}</div>}
      {error === null && url === null && <div className="caption">Loading…</div>}
      {error === null && url !== null && asset.kind === "image" && (
        <img
          src={url}
          alt={asset.originalFilename ?? "media"}
          className="w-full h-auto rounded"
        />
      )}
      {error === null && url !== null && asset.kind === "video" && (
        <video src={url} controls className="w-full h-auto rounded">
          <track kind="captions" />
        </video>
      )}
      <div className="caption mt-8">
        {asset.originalFilename ?? asset.key}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Confirm typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add features/media-library/components/MediaGrid.tsx
git commit -m "feat(media-library): media grid with per-tile signed URLs"
```

---

## Task 15: /b/[brandId]/media page

**Files:**
- Create: `app/(app)/dash/b/[brandId]/media/page.tsx`

- [ ] **Step 1: Implement the page**

```tsx
import { MediaGrid } from "@/features/media-library/components/MediaGrid";
import { MediaUploader } from "@/features/media-library/components/MediaUploader";
import type { Id } from "@/convex/_generated/dataModel";

export default async function MediaPage({
  params,
}: {
  params: Promise<{ brandId: string }>;
}) {
  const { brandId } = await params;
  const id = brandId as Id<"brand_profiles">;
  return (
    <>
      <div className="app-page-head">
        <h1>Media</h1>
        <span className="caption">Uploads, AI-generated outputs, and renders.</span>
      </div>
      <div className="mt-24">
        <MediaUploader brandId={id} />
      </div>
      <MediaGrid brandId={id} />
    </>
  );
}
```

> Brand ownership is verified by `app/(app)/dash/b/[brandId]/layout.tsx` — see comment at `app/(app)/dash/b/[brandId]/layout.tsx:1-4`. The page itself doesn't need to re-check.

- [ ] **Step 2: Confirm typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/dash/b/\[brandId\]/media/page.tsx
git commit -m "feat(media-library): /b/[brandId]/media page composing uploader + grid"
```

---

## Task 16: End-to-end smoke test (manual)

**Files:** none.

This task has no automated test — it covers the Node-runtime flows that `convex-test` cannot run. Document the result in the commit message of Task 17.

- [ ] **Step 1: Confirm Pre-flight step 1 was completed**

Verify `.env.local` has all five R2_* values populated, and `npx convex env list` shows the same five mirrored to the Convex deployment. If not, complete Pre-flight step 1 now.

- [ ] **Step 2: Start the dev server**

Run, in two terminals:
```bash
npx convex dev
pnpm dev
```

- [ ] **Step 3: Sign in and create a brand**

In the browser at http://localhost:3000 :
1. Sign up (or sign in to an existing account).
2. If onboarding shows up, create a brand named "R2 Test".
3. You land at `/dash/b/<brandId>/dashboard`.

- [ ] **Step 4: Visit the media page and upload an image**

Navigate to `/dash/b/<brandId>/media`. Click "Upload media" and pick a small `.png`. Expected:
- Toast/inline message: `Uploading <filename>…` then `Uploaded <filename>.`
- The grid populates with a tile showing the image.
- The image renders (not a broken image icon).

- [ ] **Step 5: Verify the bytes landed**

Cloudflare dashboard → R2 → `omnigrowth-media-dev` → Browse. Expect:
- One object under `dev/brand-<brandId>/uploads/<id>.png`.

- [ ] **Step 6: Verify a row exists**

Convex dashboard → Tables → `media_assets`. Expect:
- One row with the same `key`, `source: uploads`, `kind: image`, a non-null `expiresAt` ~7 days in the future (free tier).

- [ ] **Step 7: Upload a video**

Repeat Step 4 with a small `.mp4` (under 200 MB). Expected: the grid tile renders a `<video>` player that plays.

- [ ] **Step 8: Test brand isolation**

Open a private/incognito window. Sign up as a second user. Create a brand. Try navigating directly to the first user's media URL: `/dash/b/<first-user-brandId>/media`. Expected: Next.js `not-found` (the brand layout's owner check rejects).

- [ ] **Step 9: Test the cleanup cron manually**

Convex dashboard → Functions → `mediaLibrary.cleanup.purgeExpired` → "Run". Pre-condition: edit one of your test rows in the dashboard to set `expiresAt: 0`. After running:
- The row is gone from `media_assets`.
- The R2 object is gone from the bucket.
- The function output reads `{ scanned: 1, deleted: 1, failed: 0 }`.

- [ ] **Step 10: Test the soft-delete remove flow**

In the Convex dashboard → Functions → `mediaLibrary.assets.remove` → invoke with one of your asset IDs. Expected:
- The row's `expiresAt` becomes 0 (still in the table — confirm in Tables view).
- Re-run `purgeExpired` → row + R2 object are gone.

If any step fails, fix the underlying code and re-run from Step 4. Don't move on with a broken pipe.

- [ ] **Step 11: Note results**

Write down the timestamps and results — they go into the Task 17 commit message. Example:

```
Smoke 2026-05-05 14:23 UTC:
- image upload OK
- video upload OK (8.3 MB sample)
- brand isolation: not-found served correctly
- purgeExpired: deleted=1 / scanned=1 / failed=0
- soft-delete + purge: row + bytes gone
```

---

## Task 17: Update docs and add follow-up rows

**Files:**
- Modify: `docs/features/media-library.md`
- Modify: `docs/architecture.md`
- Add Coda follow-up rows at the table referenced by `MEMORY.md` "Coda TODOs location".

- [ ] **Step 1: Edit `docs/features/media-library.md`**

Change the `**Status:** stub` line to `**Status:** v1 shipped — foundation`.

In the **In scope** bullet about premade-video browsing, replace `(R2-hosted catalog, Cloudflare CDN-served)` with `(R2-hosted catalog, fetched via short-lived signed URLs)`.

In the **Open questions** section, remove `Object-key naming scheme — <env>/<studio>/<feature>/<id>.<ext> is the working default; lock it before the first migration.` (that question is now answered — keep the others).

- [ ] **Step 2: Edit `docs/architecture.md`**

In the `## Storage layer` section, replace this paragraph:

> Cloudflare R2 — every binary asset (premade clips, AI-rendered video output, AI-generated images, user uploads, brand logos). S3-compatible, served through the Cloudflare global edge. Each user-facing URL is either a public R2 dev URL or a custom-domain CNAME bound to the bucket.

With:

> Cloudflare R2 — every binary asset (premade clips, AI-rendered video output, AI-generated images, user uploads). S3-compatible, served via short-lived signed URLs minted by Convex actions. The bucket has no public access; every browser read goes through a 24h signed GET URL. See `docs/superpowers/plans/2026-05-05-r2-media-library-foundation.md`.

- [ ] **Step 3: Add Coda follow-up rows**

Use the Coda MCP (`mcp__Coda__table_rows_manage`) on the `grid-AdAYY62gSc` table to add these follow-up rows. Each row: `Title`, `Status: Open`, `Area: backend` (unless noted), `Priority: P2`, `Created: <today>`, `Notes`, `Source: docs/superpowers/plans/2026-05-05-r2-media-library-foundation.md`.

Rows to add:
1. **Title:** "Admin CLI for premade catalog seeding (`pnpm r2:upload-premade`)"
   **Notes:** Server-side S3 PUT of curated clips to `<env>/global/premade/<id>.mp4`. Reuses `lib/r2/client.ts`. Need a Convex internal mutation to insert the metadata rows with `brandId: null, source: "premade", expiresAt: null`. Triggered manually; not part of the app.

2. **Title:** "Render-worker R2 integration"
   **Area:** devops
   **Notes:** Coolify worker writes finished renders to `<env>/brand-<brandId>/renders/<id>.mp4` and POSTs the metadata back via a Convex internal mutation (server-to-server via `COOLIFY_RENDER_WEBHOOK_SECRET`). Reuses `lib/r2/client.ts`. Lock the metadata POST shape before starting.

3. **Title:** "Post-generator AI image upload to R2"
   **Notes:** When the post-generator's image step lands, write the result to `<env>/brand-<brandId>/ai-images/<id>.png` via the server-side S3 client and insert a `media_assets` row with `source: "ai-images", expiresAt: null`. Reuses `lib/r2/client.ts`.

4. **Title:** "Replace soft-delete with action-driven immediate purge in `assets.remove`"
   **Notes:** Currently `remove` patches `expiresAt: 0` and lets the daily cron reap. For UX cases where the user expects the bytes gone immediately, wrap in an action that calls `deleteObject` then `ctx.runMutation(internal.mediaLibrary.cleanup._deleteRow)`. v1 cron-cleanup is acceptable.

5. **Title:** "Tag/filter UI on `/b/[brandId]/media`"
   **Area:** UI
   **Notes:** Schema doesn't have `tags` yet. When tags are added (TBD field), the media page needs filter chips (kind, source, date). Surface in the design follow-up.

6. **Title:** "Upload progress + multi-file UX on `MediaUploader`"
   **Area:** UI
   **Notes:** Current uploader is single-file, no progress bar. Replace once the design session produces a media-library bundle.

7. **Title:** "Brand-asset uploads (logo) — block on brand-profile-v2"
   **Area:** UI
   **Notes:** `source: "brand-assets"` and `expiresAt: null` already in the schema. Wire when brand-profile-v2 lands (per `MEMORY.md` "Brand profile intent": deferred until AI features).

- [ ] **Step 4: Confirm everything is clean**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: zero failures.

- [ ] **Step 5: Commit**

```bash
git add docs/features/media-library.md docs/architecture.md
git commit -m "$(cat <<'EOF'
docs: flip media-library to v1 shipped, correct storage-layer description

Smoke 2026-05-05 (paste from Task 16 Step 11 here):
- image upload OK
- video upload OK
- brand isolation: not-found served correctly
- purgeExpired: deleted=1 / scanned=1 / failed=0
- soft-delete + purge: row + bytes gone
EOF
)"
```

---

## Self-review checklist (already run by the planner)

- ✅ Spec coverage — every locked decision (Q1–Q6 + TTL) maps to a task. The bucket has no public access (Pre-flight 1.b + smoke Step 8). Tier retention is encoded in `lib/billing/tiers.ts` + `lib/r2/retention.ts` (Task 4). Key scheme is the single source of truth in `lib/r2/keys.ts` (Task 2). Brand isolation is enforced at every Convex entry point + verified by tests in Tasks 8–9. Cleanup cron exists and is registered (Tasks 11–12). Smoke test exercises the full pipe (Task 16).
- ✅ No placeholders — every task ships exact code, exact paths, exact commands.
- ✅ Type consistency — `AssetKind` / `AssetEnv` / `AssetScope` are defined once in `lib/r2/keys.ts` and reused across `mime.ts`, `retention.ts`, `client.ts`, `presign.ts`. The schema's `source` literal union mirrors `AssetKind` exactly.

---

## Execution handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-05-r2-media-library-foundation.md`. Two execution options:**

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
