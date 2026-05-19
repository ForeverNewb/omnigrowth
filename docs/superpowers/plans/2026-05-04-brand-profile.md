# Brand Profile v1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the brand-profile feature as the workspace boundary for OmniGrowth: schema for `brand_profiles`, CRUD layer with tier-quota enforcement, an onboarding gate for fresh users, and a `/b/[brandId]/...` route restructure that scopes dashboard/calendar/analytics by active brand.

**Architecture:** A user owns many `brand_profiles`; ownership is verified once at the `app/(app)/b/[brandId]/layout.tsx` boundary so downstream `brandId`-only foreign keys are safe. Active brand is read from the URL — no cookie, no React context, no `lastActiveBrandId`. Onboarding state is derived from "user has zero brands". Tier (`free`/`pro`/`agency`) lives on the user; quotas come from a hardcoded constants map in `lib/billing/tiers.ts`. Convex Auth's `Password({ profile })` callback writes `tier: "free"` at signup.

**Tech Stack:** Next.js 16 App Router, Convex 1.17, `@convex-dev/auth` 0.0.92, Vitest + `convex-test`, TypeScript, Biome.

**Source spec:** `docs/superpowers/specs/2026-05-04-brand-profile-design.md`

---

## File Structure

**New files:**
- `lib/billing/tiers.ts` — `BRAND_LIMIT_BY_TIER` constant + `assertBrandQuotaOk` pure helper.
- `lib/billing/tiers.test.ts` — Vitest tests for the helper.
- `features/brand-profile/schema.ts` — `brand_profiles` table fragment.
- `features/brand-profile/feature.config.ts` — feature manifest.
- `features/brand-profile/README.md` — short pointer to the docs/feature spec.
- `convex/brandProfile/brands.ts` — `list`/`get`/`create`/`rename`/`remove` entry points. (Lives under `convex/`, not `features/brand-profile/convex/`, because Convex's codegen and bundler discover functions by their physical path inside the configured functions directory; see Pre-flight note 5.)
- `convex/brandProfile/brands.test.ts` — convex-test integration tests, co-located with the implementation.
- `features/brand-profile/components/CreateBrandForm.tsx` — used by `/onboarding` and "+ New brand".
- `features/brand-profile/components/BrandSwitcher.tsx` — dropdown in app chrome.
- `app/(app)/page.tsx` — bare-`/` redirector inside the app group.
- `app/(app)/onboarding/page.tsx` — name-your-first-brand screen.
- `app/(app)/b/[brandId]/layout.tsx` — owner check + brand chrome with `BrandSwitcher`.
- `app/(app)/b/[brandId]/dashboard/page.tsx` — moved from old top-level.
- `app/(app)/b/[brandId]/calendar/page.tsx` — moved from old top-level.
- `app/(app)/b/[brandId]/analytics/page.tsx` — moved from old top-level.
- `vitest.config.ts` — vitest + convex-test edge-runtime config.

**Modified files:**
- `convex/schema.ts` — drop `authSchema` import, add `brandProfileSchema` import and spread.
- `convex/shared/schema.ts` — re-declare `users` table verbatim with `tier` field added.
- `convex/shared/users.ts` — add internal `updateTier` mutation.
- `convex/auth.ts` — switch `Password` to `Password<DataModel>({ profile })` writing `tier: "free"` on signup.
- `middleware.ts` — replace `/dashboard|calendar|analytics` matcher with `/onboarding|b`; redirect target post-login switches from `/dashboard` to `/`.
- `features/auth/components/LoginPortfolio.tsx` — post-signin `router.push` switches from `/dashboard` to `/`.
- `package.json` — add `convex-test`, `@edge-runtime/vm`, `vite-tsconfig-paths` dev dependencies.

**Deleted files:**
- `features/auth/schema.ts` — empty stub no longer imported anywhere.
- `app/(app)/dashboard/` — moved.
- `app/(app)/calendar/` — moved.
- `app/(app)/analytics/` — moved.

---

## Pre-flight (read before starting)

1. **Convex dev DB will accept the new schema only after the existing `users` rows are removed or migrated.** Adding a non-optional `tier` field to an existing schema requires that every existing row has the new field. Pre-launch this codebase has no real users; the safe path is to wipe dev. Stop any running `pnpm convex dev`, then run `npx convex dashboard` and clear the `users` table (or run `npx convex run --no-push <some_clear_fn>` after writing one). The simplest is the dashboard "Clear table" button. If the implementer is mid-development with seeded data they want to keep, the alternative is to make `tier` `v.optional(...)` first, backfill via a one-off mutation, then swap to required in a follow-up — but for v1 this plan assumes a wipe.

2. **Context7 was used during spec finalisation** to verify the `Password({ profile })` API and the `users` override pattern. Both are locked in the spec under "Verified API surface". If the implementer hits a contradiction with the live API, re-fetch via Context7 before changing the plan.

3. **Tests use `convex-test` with an auth-identity shim.** Verified by reading `node_modules/@convex-dev/auth/dist/server/implementation/index.js:342–349`: `getAuthUserId(ctx)` calls `ctx.auth.getUserIdentity()` and does `identity.subject.split("|")[0]` — `TOKEN_SUB_CLAIM_DIVIDER` is the literal `"|"`. So `t.withIdentity({ subject: \`${userId}|sess\` })` is enough to simulate an authenticated request. No real session row is required.

4. **UI styling is intentionally minimal.** `components/ui/` contains only `ThemeScript`/`ThemeToggle`; the existing dashboard uses class names like `app-page-head`, `kpi`, `grid-4` defined in `app/globals.css`. The brand-profile UI tasks below follow the same convention. The user runs UI design out-of-band (per `docs/handoffs/2026-05-03-ui-scaffold.md`) and will refine the visuals later. Don't introduce shadcn primitives in this plan.

5. **Convex function code lives under `convex/`, not under `features/<name>/convex/`.** The architecture doc convention says "each feature owns its queries/mutations" — that's a logical association. Physically, Convex's codegen and bundler scan the configured functions directory (default `./convex/`). Re-exporting from outside that directory has two failure modes (bundler may not resolve TS path aliases in bundled files; codegen may not register types from `export *` re-exports) that are not worth risking for a v1 feature. The existing `convex/shared/users.ts` is the precedent. Tests live alongside the implementation under `convex/`.

   Imports inside `convex/`-bundled files use **relative paths** (e.g. `from "../_generated/server"`, `from "../../lib/billing/tiers"`), not `@/` aliases. The Next.js side (`app/`, `features/<name>/components/`) continues to use `@/` aliases as today.

---

## Task 1: Tier constants + pure quota helper

**Files:**
- Create: `lib/billing/tiers.ts`
- Create: `lib/billing/tiers.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/billing/tiers.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { BRAND_LIMIT_BY_TIER, assertBrandQuotaOk } from "./tiers";

describe("BRAND_LIMIT_BY_TIER", () => {
  it("matches the published tier table", () => {
    expect(BRAND_LIMIT_BY_TIER).toEqual({ free: 1, pro: 3, agency: 10 });
  });
});

describe("assertBrandQuotaOk", () => {
  it("passes when count is under the tier's limit", () => {
    expect(() => assertBrandQuotaOk(0, "free")).not.toThrow();
    expect(() => assertBrandQuotaOk(2, "pro")).not.toThrow();
    expect(() => assertBrandQuotaOk(9, "agency")).not.toThrow();
  });

  it("throws when count is at or above the tier's limit", () => {
    expect(() => assertBrandQuotaOk(1, "free")).toThrow(/BRAND_QUOTA_EXCEEDED/);
    expect(() => assertBrandQuotaOk(3, "pro")).toThrow(/BRAND_QUOTA_EXCEEDED/);
    expect(() => assertBrandQuotaOk(10, "agency")).toThrow(/BRAND_QUOTA_EXCEEDED/);
  });

  it("includes the limit and tier in the thrown error data", () => {
    try {
      assertBrandQuotaOk(1, "free");
      throw new Error("should have thrown");
    } catch (err) {
      // ConvexError exposes the structured payload on `.data`.
      // We accept either ConvexError or a plain Error whose message is JSON, since the
      // test runs outside the Convex runtime; the production type is ConvexError.
      const data = (err as { data?: unknown }).data;
      expect(data).toEqual({ code: "BRAND_QUOTA_EXCEEDED", limit: 1, tier: "free" });
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```
pnpm test lib/billing/tiers.test.ts
```

Expected: FAIL with "Cannot find module './tiers'" or similar (no implementation yet). If pnpm test errors with "no vitest config" instead, that means `vitest.config.ts` hasn't been created yet — proceed to Task 2 first, then come back. (This plan orders Tier constants first because the helper is a pure dependency of the Convex mutation and is the simplest TDD on-ramp; if your local pnpm setup needs a vitest config to even discover tests, swap the order with Task 2.)

- [ ] **Step 3: Write the minimal implementation**

Create `lib/billing/tiers.ts`:

```ts
// Tier-driven brand-profile quota. Read by convex/brandProfile/brands.ts
// at create-time, and (later) by features/settings-billing/ to display the cap.
// Why lib/billing/ and not inside features/brand-profile/: per docs/architecture.md
// rule 4, lib/ is for things consumed across feature boundaries. The brand cap is
// one of several tier dimensions; settings-billing will read this same map.

import { ConvexError } from "convex/values";

export const BRAND_LIMIT_BY_TIER = {
  free: 1,
  pro: 3,
  agency: 10,
} as const;

export type Tier = keyof typeof BRAND_LIMIT_BY_TIER;

export function assertBrandQuotaOk(currentCount: number, tier: Tier): void {
  const limit = BRAND_LIMIT_BY_TIER[tier];
  if (currentCount >= limit) {
    throw new ConvexError({
      code: "BRAND_QUOTA_EXCEEDED",
      limit,
      tier,
    });
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

```
pnpm test lib/billing/tiers.test.ts
```

Expected: 3 passing tests.

- [ ] **Step 5: Commit**

```bash
git add lib/billing/tiers.ts lib/billing/tiers.test.ts
git commit -m "feat(billing): add BRAND_LIMIT_BY_TIER and pure quota assertion"
```

---

## Task 2: Vitest + convex-test setup

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Install dev dependencies**

```
pnpm add -D convex-test @edge-runtime/vm vite-tsconfig-paths
```

Expected: `package.json` `devDependencies` gains the three packages. `pnpm-lock.yaml` updates.

- [ ] **Step 2: Create the vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    // edge-runtime matches the Convex runtime closely enough that convex-test's
    // mocks behave the same as production. Confirmed by Convex docs at
    // /docs/testing/convex-test (fetched via Context7, 2026-05-04).
    environment: "edge-runtime",
  },
});
```

(The `tsconfigPaths` plugin lets test files use the `@/` alias to import the schema, since Vitest's default resolver doesn't read `tsconfig.json` paths. We don't need any other vitest options for v1.)

- [ ] **Step 3: Re-run the Task 1 tests**

```
pnpm test lib/billing/tiers.test.ts
```

Expected: 3 passing tests, this time discovered through the vitest config (test runner UI will show the config path in its banner).

- [ ] **Step 4: Smoke-test convex-test wiring**

Create a temporary file at `convex/_smoke.test.ts` to confirm the test runtime can load the Convex schema and discover function modules. (Will be deleted after this task.)

```ts
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { test, expect } from "vitest";
import schema from "./schema";

// Discover all .ts files under convex/. convex-test needs this to register
// query/mutation/action functions; without it, t.query(api.foo.bar, ...) calls
// fail at lookup time. The `!(*.*.*)` glob excludes files with two dots in
// the name (like `brands.test.ts`), so test files don't get loaded as
// function modules — recommended pattern from Convex docs /docs/testing/convex-test.
const modules = import.meta.glob("./**/!(*.*.*)*.*s");

test("convex-test boots with the project schema and modules", async () => {
  const t = convexTest(schema, modules);
  // No-op assertion — we only care that boot didn't throw.
  expect(t).toBeDefined();
});
```

Run:

```
pnpm test convex/_smoke.test.ts
```

Expected: PASS. If this fails with a path-alias resolution error (e.g. "Cannot find module '@/features/...'"), confirm `tsconfig.json` has the `"@/*"` path mapping and that `vite-tsconfig-paths` is registered in `vitest.config.ts` plugins.

- [ ] **Step 5: Delete the smoke file and commit**

```bash
rm convex/_smoke.test.ts
git add vitest.config.ts package.json pnpm-lock.yaml
git commit -m "chore(test): wire vitest + convex-test for edge runtime"
```

---

## Task 3: Schema migration + auth profile callback (atomic)

This task lands the schema and auth changes together because they must arrive in the same Convex push: the schema requires `users.tier` non-optional, and `Password({ profile })` is what populates it on signup.

**Files:**
- Modify: `convex/shared/schema.ts`
- Modify: `convex/auth.ts`
- Modify: `convex/schema.ts`
- Create: `features/brand-profile/schema.ts`
- Create: `features/brand-profile/feature.config.ts`
- Create: `features/brand-profile/README.md`
- Delete: `features/auth/schema.ts`

- [ ] **Step 1: Wipe the dev Convex DB**

In the Convex dashboard for the dev deployment, open the `users` table and use "Clear table". Repeat for `authAccounts`, `authSessions`, `authVerificationCodes`, `authVerifiers` if they have rows. (Per the pre-flight note: this is acceptable because no real users exist yet.)

If the implementer prefers a CLI path: stop the running `pnpm convex dev`, then `npx convex run` a quick clear function — but the dashboard is faster.

- [ ] **Step 2: Override the users table**

Replace the contents of `convex/shared/schema.ts` with:

```ts
// Cross-feature shared tables. Convex Auth's tables (authSessions,
// authAccounts, authVerificationCodes, authVerifiers) are spread from
// `authTables`; we override the default `users` table to add a `tier` field.
//
// Per the @convex-dev/auth docs (verified via Context7, 2026-05-04), there is
// no spread-friendly helper for the users override — every default field must
// be re-declared verbatim alongside any custom field.

import { authTables } from "@convex-dev/auth/server";
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const sharedSchema = {
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    tier: v.union(
      v.literal("free"),
      v.literal("pro"),
      v.literal("agency"),
    ),
  }).index("email", ["email"]),
} as const;
```

(Note: only the `email` index is preserved, matching the convex-auth docs example. The phone index isn't needed because we're Password-only in v1.)

- [ ] **Step 3: Add the brand-profile schema fragment**

Create `features/brand-profile/schema.ts`:

```ts
// brand_profiles is the workspace boundary: every brand-scoped feature
// (post-generator, calendar, analytics, connected-accounts) carries a
// `brandId` foreign key referencing this table. See
// docs/features/brand-profile.md and docs/superpowers/specs/2026-05-04-brand-profile-design.md.

import { defineTable } from "convex/server";
import { v } from "convex/values";

export const brandProfileSchema = {
  brand_profiles: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.string(), // free text, may be ""
    voice: v.string(),       // free text, may be ""
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
} as const;
```

- [ ] **Step 4: Create the feature config and README**

Create `features/brand-profile/feature.config.ts`:

```ts
export const featureConfig = {
  name: "brand-profile",
  version: "0.1.0",
  enabled: true,
  dependencies: ["auth", "settings-billing"] as const,
} as const;
```

Create `features/brand-profile/README.md`:

```markdown
# brand-profile

Workspace boundary for OmniGrowth. One user owns many brand profiles; everything user-facing (connected accounts, posts, calendar, analytics, generation jobs) is scoped under a brand.

Spec: `docs/features/brand-profile.md`
v1 design: `docs/superpowers/specs/2026-05-04-brand-profile-design.md`
```

- [ ] **Step 5: Wire brandProfileSchema into convex/schema.ts and drop authSchema**

Replace the contents of `convex/schema.ts` with:

```ts
// Composes per-feature schema fragments. See docs/architecture.md.
// Each feature owns its own tables under features/<name>/schema.ts.

import { analyticsSchema } from "@/features/analytics/schema";
import { brandProfileSchema } from "@/features/brand-profile/schema";
import { calendarSchema } from "@/features/calendar/schema";
import { dashboardSchema } from "@/features/dashboard/schema";
import { landingSchema } from "@/features/landing/schema";
import { postGeneratorSchema } from "@/features/post-generator/schema";
import { defineSchema } from "convex/server";
import { sharedSchema } from "./shared/schema";

export default defineSchema({
  ...sharedSchema,
  ...landingSchema,
  ...brandProfileSchema,
  ...dashboardSchema,
  ...postGeneratorSchema,
  ...calendarSchema,
  ...analyticsSchema,
});
```

- [ ] **Step 6: Delete the empty authSchema stub**

```bash
rm features/auth/schema.ts
```

(`features/auth/feature.config.ts`, `features/auth/components/`, `features/auth/README.md` stay.)

- [ ] **Step 7: Update the Password provider with the profile callback**

Replace the contents of `convex/auth.ts` with:

```ts
// Convex Auth boot. Wires the Password provider with a `profile` callback
// that writes `tier: "free"` onto the new user row. The `users` table is
// extended with `tier` in convex/shared/schema.ts.
//
// API verified against /get-convex/convex-auth via Context7 (2026-05-04):
// `profile(params, ctx)` runs at user creation, and any returned fields are
// written to the user document. Parameterising `Password<DataModel>` gives
// strict type-checking against the overridden users table.

import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import type { DataModel } from "./_generated/dataModel";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password<DataModel>({
      profile(params, _ctx) {
        return {
          email: params.email as string,
          tier: "free" as const,
        };
      },
    }),
  ],
});
```

- [ ] **Step 8: Push the schema and verify**

```
pnpm convex dev
```

Expected: the CLI accepts the new schema and pushes successfully. If it errors with "field 'tier' missing on existing rows", repeat Step 1 (the wipe didn't catch every row).

- [ ] **Step 9: Typecheck**

```
pnpm typecheck
```

Expected: no errors. If `Password<DataModel>` complains about the `profile` return type, double-check that `convex/_generated/dataModel.d.ts` reflects the new `users.tier` field (the convex CLI regenerates it during the push in Step 8).

- [ ] **Step 10: Commit**

```bash
git add convex/shared/schema.ts convex/schema.ts convex/auth.ts \
        features/brand-profile/schema.ts features/brand-profile/feature.config.ts \
        features/brand-profile/README.md
git rm features/auth/schema.ts
git commit -m "feat(schema): add brand_profiles + tier on users; auth writes tier=free at signup"
```

---

## Task 4: brands.list query (TDD with convex-test)

**Files:**
- Create: `convex/brandProfile/brands.ts`
- Create: `convex/brandProfile/brands.test.ts`

- [ ] **Step 1: Write the failing test**

Create `convex/brandProfile/brands.test.ts`:

```ts
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "../schema";
import { api } from "../_generated/api";

// convex-test needs a glob of every function module so it can register them
// on the in-memory backend. The glob is rooted at the convex/ directory.
// `!(*.*.*)` excludes files like `brands.test.ts` (two dots in the name) so
// test files don't get loaded as function modules.
const modules = import.meta.glob("../**/!(*.*.*)*.*s");

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
        userId: aliceId, name: "Older",
        description: "", voice: "",
        createdAt: t0, updatedAt: t0,
      }),
    );
    const newerId = await t.run(async (ctx) =>
      ctx.db.insert("brand_profiles", {
        userId: aliceId, name: "Newer",
        description: "", voice: "",
        createdAt: t0 + 1000, updatedAt: t0 + 1000,
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
        userId: aliceId, name: "Alice's Brand",
        description: "", voice: "",
        createdAt: Date.now(), updatedAt: Date.now(),
      }),
    );

    const result = await t.withIdentity(asUser(bobId)).query(api.brandProfile.brands.list, {});
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```
pnpm test convex/brandProfile/brands.test.ts
```

Expected: FAIL — `api.brandProfile.brands.list` doesn't exist yet (the generated `api` won't have a `brandProfile` namespace, and the implementation file doesn't exist). This is fine; we'll run again after Step 3 + the convex codegen push.

- [ ] **Step 3: Write the minimal implementation**

Create `convex/brandProfile/brands.ts`:

```ts
// Brand-profile CRUD. Lives under convex/ (not features/brand-profile/convex/)
// because Convex codegen and bundler scan the configured functions directory
// directly — see docs/superpowers/plans/2026-05-04-brand-profile.md "Pre-flight
// note 5". The feature ownership is logical: this file implements the
// brand-profile feature's queries/mutations.

import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "../_generated/server";
import { assertBrandQuotaOk, type Tier } from "../../lib/billing/tiers";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError({ code: "UNAUTHENTICATED" });
    }
    return await ctx.db
      .query("brand_profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("asc")
      .collect();
  },
});
```

- [ ] **Step 4: Push and let Convex regenerate the API types**

Run `pnpm convex dev` once. The CLI re-bundles the new file under `convex/brandProfile/` and updates `convex/_generated/api.d.ts` so `api.brandProfile.brands.list` is typed and callable.

- [ ] **Step 5: Run the test to verify it passes**

```
pnpm test convex/brandProfile/brands.test.ts
```

Expected: 3 passing tests.

- [ ] **Step 6: Commit**

```bash
git add convex/brandProfile/brands.ts convex/brandProfile/brands.test.ts
git commit -m "feat(brand-profile): brands.list query"
```

---

## Task 5: brands.get query (TDD)

**Files:**
- Modify: `convex/brandProfile/brands.ts`
- Modify: `convex/brandProfile/brands.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `convex/brandProfile/brands.test.ts`:

```ts
describe("brands.get", () => {
  it("returns the brand when the caller owns it", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "alice@example.com", tier: "free" }),
    );
    const brandId = await t.run(async (ctx) =>
      ctx.db.insert("brand_profiles", {
        userId: aliceId, name: "Alice's",
        description: "", voice: "",
        createdAt: Date.now(), updatedAt: Date.now(),
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
        userId: aliceId, name: "Alice's",
        description: "", voice: "",
        createdAt: Date.now(), updatedAt: Date.now(),
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
        userId: aliceId, name: "Tmp", description: "", voice: "",
        createdAt: Date.now(), updatedAt: Date.now(),
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
```

- [ ] **Step 2: Run the test to verify it fails**

```
pnpm test convex/brandProfile/brands.test.ts
```

Expected: 3 failing tests in the `brands.get` describe block ("brands.get is not a function" or similar).

- [ ] **Step 3: Implement brands.get**

Append to `convex/brandProfile/brands.ts`:

```ts
export const get = query({
  args: { brandId: v.id("brand_profiles") },
  handler: async (ctx, { brandId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const brand = await ctx.db.get(brandId);
    if (brand === null) return null;
    if (brand.userId !== userId) return null;
    return brand;
  },
});
```

- [ ] **Step 4: Run the test to verify it passes**

```
pnpm test convex/brandProfile/brands.test.ts
```

Expected: all `brands.list` and `brands.get` tests pass (6 total).

- [ ] **Step 5: Commit**

```bash
git add convex/brandProfile/brands.ts convex/brandProfile/brands.test.ts
git commit -m "feat(brand-profile): brands.get query (returns null on wrong owner)"
```

---

## Task 6: brands.create mutation (TDD with quota enforcement)

**Files:**
- Modify: `convex/brandProfile/brands.ts`
- Modify: `convex/brandProfile/brands.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `convex/brandProfile/brands.test.ts`:

```ts
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

    const brandId = await t
      .withIdentity(asUser(aliceId))
      .mutation(api.brandProfile.brands.create, {
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
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```
pnpm test convex/brandProfile/brands.test.ts
```

Expected: 5 new failures in `brands.create`.

- [ ] **Step 3: Implement brands.create**

Append to `convex/brandProfile/brands.ts`:

```ts
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    voice: v.optional(v.string()),
  },
  handler: async (ctx, { name, description, voice }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError({ code: "UNAUTHENTICATED" });
    }
    const user = await ctx.db.get(userId);
    if (user === null) {
      // Defence in depth — the user row should always exist for an authed caller.
      throw new ConvexError({ code: "UNAUTHENTICATED" });
    }
    const existing = await ctx.db
      .query("brand_profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    assertBrandQuotaOk(existing.length, user.tier as Tier);

    const now = Date.now();
    return await ctx.db.insert("brand_profiles", {
      userId,
      name,
      description: description ?? "",
      voice: voice ?? "",
      createdAt: now,
      updatedAt: now,
    });
  },
});
```

- [ ] **Step 4: Run the tests to verify they pass**

```
pnpm test convex/brandProfile/brands.test.ts
```

Expected: all 11 tests across the file pass.

- [ ] **Step 5: Commit**

```bash
git add convex/brandProfile/brands.ts convex/brandProfile/brands.test.ts
git commit -m "feat(brand-profile): brands.create with tier-aware quota enforcement"
```

---

## Task 7: brands.rename mutation (TDD)

**Files:**
- Modify: `convex/brandProfile/brands.ts`
- Modify: `convex/brandProfile/brands.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `convex/brandProfile/brands.test.ts`:

```ts
describe("brands.rename", () => {
  it("renames a brand the caller owns and bumps updatedAt", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "alice@example.com", tier: "free" }),
    );
    const t0 = 1_000_000;
    const brandId = await t.run(async (ctx) =>
      ctx.db.insert("brand_profiles", {
        userId: aliceId, name: "Old", description: "", voice: "",
        createdAt: t0, updatedAt: t0,
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
        userId: aliceId, name: "Alice's", description: "", voice: "",
        createdAt: Date.now(), updatedAt: Date.now(),
      }),
    );

    await expect(
      t.withIdentity(asUser(bobId))
        .mutation(api.brandProfile.brands.rename, { brandId, name: "Hijacked" }),
    ).rejects.toThrowError(/NOT_FOUND/);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```
pnpm test convex/brandProfile/brands.test.ts
```

Expected: 2 new failures.

- [ ] **Step 3: Implement brands.rename**

Append to `convex/brandProfile/brands.ts`:

```ts
export const rename = mutation({
  args: { brandId: v.id("brand_profiles"), name: v.string() },
  handler: async (ctx, { brandId, name }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError({ code: "UNAUTHENTICATED" });
    }
    const brand = await ctx.db.get(brandId);
    if (brand === null || brand.userId !== userId) {
      throw new ConvexError({ code: "NOT_FOUND" });
    }
    await ctx.db.patch(brandId, { name, updatedAt: Date.now() });
  },
});
```

- [ ] **Step 4: Run the tests to verify they pass**

```
pnpm test convex/brandProfile/brands.test.ts
```

Expected: all 13 tests pass.

- [ ] **Step 5: Commit**

```bash
git add convex/brandProfile/brands.ts convex/brandProfile/brands.test.ts
git commit -m "feat(brand-profile): brands.rename with owner check"
```

---

## Task 8: brands.remove mutation with cascade extension point (TDD)

**Files:**
- Modify: `convex/brandProfile/brands.ts`
- Modify: `convex/brandProfile/brands.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `convex/brandProfile/brands.test.ts`:

```ts
describe("brands.remove", () => {
  it("deletes a brand the caller owns", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "alice@example.com", tier: "free" }),
    );
    const brandId = await t.run(async (ctx) =>
      ctx.db.insert("brand_profiles", {
        userId: aliceId, name: "Doomed", description: "", voice: "",
        createdAt: Date.now(), updatedAt: Date.now(),
      }),
    );

    await t
      .withIdentity(asUser(aliceId))
      .mutation(api.brandProfile.brands.remove, { brandId });

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
        userId: aliceId, name: "Alice's", description: "", voice: "",
        createdAt: Date.now(), updatedAt: Date.now(),
      }),
    );

    await expect(
      t.withIdentity(asUser(bobId))
        .mutation(api.brandProfile.brands.remove, { brandId }),
    ).rejects.toThrowError(/NOT_FOUND/);

    // Confirm the brand still exists (the failed delete didn't half-apply).
    const stored = await t.run(async (ctx) => ctx.db.get(brandId));
    expect(stored).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```
pnpm test convex/brandProfile/brands.test.ts
```

Expected: 2 new failures.

- [ ] **Step 3: Implement brands.remove**

Append to `convex/brandProfile/brands.ts`:

```ts
export const remove = mutation({
  args: { brandId: v.id("brand_profiles") },
  handler: async (ctx, { brandId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError({ code: "UNAUTHENTICATED" });
    }
    const brand = await ctx.db.get(brandId);
    if (brand === null || brand.userId !== userId) {
      throw new ConvexError({ code: "NOT_FOUND" });
    }

    // CASCADE EXTENSION POINT.
    // Every future brand-scoped table must add its own block here, deleting
    // every row whose `brandId` foreign key matches the brand being removed,
    // *before* the brand itself is deleted. The whole thing runs in a single
    // Convex transaction.
    //
    // Example for the calendar feature once it lands:
    //   for (const row of await ctx.db
    //     .query("calendar_events")
    //     .withIndex("by_brand", (q) => q.eq("brandId", brandId))
    //     .collect()) {
    //     await ctx.db.delete(row._id);
    //   }
    // v1 has no downstream brand-scoped tables yet, so no cascade blocks here.

    await ctx.db.delete(brandId);
  },
});
```

- [ ] **Step 4: Run the tests to verify they pass**

```
pnpm test convex/brandProfile/brands.test.ts
```

Expected: all 15 tests pass.

- [ ] **Step 5: Commit**

```bash
git add convex/brandProfile/brands.ts convex/brandProfile/brands.test.ts
git commit -m "feat(brand-profile): brands.remove with cascade extension point"
```

---

## Task 9: updateTier internal mutation

**Files:**
- Modify: `convex/shared/users.ts`

- [ ] **Step 1: Write the implementation**

Replace the contents of `convex/shared/users.ts` with:

```ts
// Cross-feature user queries. Per docs/architecture.md, anything that's not
// owned by a single feature (auth, users) lives under convex/shared/.
//
// Addressable as `api.shared.users.viewer` from the Next.js side.

import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internalMutation, query } from "../_generated/server";

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    return await ctx.db.get(userId);
  },
});

// Internal so it cannot be called directly from the client. Used by:
//   - the future Stripe webhook in features/settings-billing/
//   - dev-time `npx convex run shared:users:updateTier` invocations to flip
//     your own tier in dev without going through billing.
export const updateTier = internalMutation({
  args: {
    userId: v.id("users"),
    tier: v.union(v.literal("free"), v.literal("pro"), v.literal("agency")),
  },
  handler: async (ctx, { userId, tier }) => {
    const user = await ctx.db.get(userId);
    if (user === null) {
      throw new ConvexError({ code: "NOT_FOUND", entity: "user" });
    }
    await ctx.db.patch(userId, { tier });
  },
});
```

- [ ] **Step 2: Typecheck**

```
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Verify the function appears in the generated API**

After `pnpm convex dev` regenerates, `convex/_generated/api.d.ts` should include `internal.shared.users.updateTier`. (Internal mutations live on `internal`, not `api`.)

- [ ] **Step 4: Commit**

```bash
git add convex/shared/users.ts
git commit -m "feat(shared): internal updateTier mutation for billing webhook + dev flips"
```

---

## Task 10: Move dashboard, calendar, analytics under /b/[brandId]/

**Files:**
- Move: `app/(app)/dashboard/page.tsx` → `app/(app)/b/[brandId]/dashboard/page.tsx`
- Move: `app/(app)/calendar/page.tsx` → `app/(app)/b/[brandId]/calendar/page.tsx`
- Move: `app/(app)/analytics/page.tsx` → `app/(app)/b/[brandId]/analytics/page.tsx`

These are pure file moves. The pages themselves don't need to read `brandId` yet — Task 11 (`b/[brandId]/layout.tsx`) does the ownership check, and the pages currently render hardcoded demo data.

- [ ] **Step 1: Create the target directories**

```bash
mkdir -p 'app/(app)/b/[brandId]/dashboard'
mkdir -p 'app/(app)/b/[brandId]/calendar'
mkdir -p 'app/(app)/b/[brandId]/analytics'
```

- [ ] **Step 2: Move the page files**

```bash
git mv 'app/(app)/dashboard/page.tsx' 'app/(app)/b/[brandId]/dashboard/page.tsx'
git mv 'app/(app)/calendar/page.tsx' 'app/(app)/b/[brandId]/calendar/page.tsx'
git mv 'app/(app)/analytics/page.tsx' 'app/(app)/b/[brandId]/analytics/page.tsx'
```

- [ ] **Step 3: Remove the now-empty old directories**

```bash
rmdir 'app/(app)/dashboard' 'app/(app)/calendar' 'app/(app)/analytics'
```

- [ ] **Step 4: Typecheck**

```
pnpm typecheck
```

Expected: no errors. The pages don't use `params` so the move is invisible to them.

- [ ] **Step 5: Commit**

```bash
git add 'app/(app)/b'
# the git rm of the old dirs was implicit via git mv
git commit -m "refactor(routes): move dashboard, calendar, analytics under b/[brandId]/"
```

---

## Task 11: b/[brandId]/layout.tsx with server-side owner check

**Files:**
- Create: `app/(app)/b/[brandId]/layout.tsx`

`BrandSwitcher` is created in Task 14. To keep the typecheck green between tasks, this layout ships *without* the BrandSwitcher import; Task 14 adds the import and the JSX line as its last step.

- [ ] **Step 1: Write the layout (no BrandSwitcher yet)**

Create `app/(app)/b/[brandId]/layout.tsx`:

```tsx
// Single place where brand ownership is verified on the server. Every page
// under app/(app)/b/[brandId]/ inherits this check. Per the spec, this is the
// structural reason brand-scoped queries can trust the `brandId` foreign key
// alone — the auth boundary is enforced once, here.

import { fetchQuery } from "convex/nextjs";
import { notFound } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";

export default async function BrandLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ brandId: string }>;
}) {
  const { brandId } = await params;
  const token = await convexAuthNextjsToken();
  const brand = await fetchQuery(
    api.brandProfile.brands.get,
    { brandId: brandId as Id<"brand_profiles"> },
    { token },
  );
  if (brand === null) notFound();

  return (
    <>
      <div className="brand-chrome">
        {/* BrandSwitcher wired in Task 14 */}
      </div>
      {children}
    </>
  );
}
```

- [ ] **Step 2: Typecheck**

```
pnpm typecheck
```

Expected: no errors. (If `convexAuthNextjsToken` cannot be found from `@convex-dev/auth/nextjs/server`, check the installed `@convex-dev/auth` version exports — at v0.0.92 this helper exists. If the export name differs in the installed version, search the package's `dist/nextjs/server` for the equivalent helper that returns the auth token cookie value, and update this import accordingly.)

- [ ] **Step 3: Commit**

```bash
git add 'app/(app)/b/[brandId]/layout.tsx'
git commit -m "feat(routes): brand chrome layout with server-side owner check"
```

---

## Task 12: app/(app)/page.tsx redirector

**Files:**
- Create: `app/(app)/page.tsx`

- [ ] **Step 1: Write the redirector**

Create `app/(app)/page.tsx`:

```tsx
// Bare `/` inside the (app) group. Resolves the post-login destination:
//   - 0 brands → /onboarding
//   - 1+ brands → /b/<oldest>/dashboard
// Middleware (middleware.ts) handles signed-out → /login; this component runs
// only after auth has passed.

import { fetchQuery } from "convex/nextjs";
import { redirect } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";

export default async function AppIndex() {
  const token = await convexAuthNextjsToken();
  const brands = await fetchQuery(api.brandProfile.brands.list, {}, { token });
  if (brands.length === 0) {
    redirect("/onboarding");
  }
  redirect(`/b/${brands[0]._id}/dashboard`);
}
```

- [ ] **Step 2: Typecheck**

```
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add 'app/(app)/page.tsx'
git commit -m "feat(routes): /(app)/ index redirects to onboarding or oldest brand"
```

---

## Task 13: CreateBrandForm component

**Files:**
- Create: `features/brand-profile/components/CreateBrandForm.tsx`

- [ ] **Step 1: Write the component**

Create `features/brand-profile/components/CreateBrandForm.tsx`:

```tsx
"use client";

// Used by /onboarding (which navigates to the new brand's dashboard) and the
// "+ New brand" entry in the BrandSwitcher (which calls `onCreated` to handle
// its own navigation). The form itself is intentionally minimal: just a name
// field. description and voice are out of scope for v1; they can be edited
// later from a brand settings screen (also out of scope for v1).

import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

interface Props {
  onCreated: (brandId: Id<"brand_profiles">) => void;
}

interface QuotaError {
  code: "BRAND_QUOTA_EXCEEDED";
  limit: number;
  tier: "free" | "pro" | "agency";
}

function isQuotaError(data: unknown): data is QuotaError {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { code?: string }).code === "BRAND_QUOTA_EXCEEDED"
  );
}

export function CreateBrandForm({ onCreated }: Props) {
  const create = useMutation(api.brandProfile.brands.create);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      const brandId = await create({ name: name.trim() });
      onCreated(brandId);
    } catch (err) {
      // ConvexError surfaces structured payloads on `err.data` in the client SDK.
      const data = (err as { data?: unknown }).data;
      if (isQuotaError(data)) {
        setError(
          `You've reached your ${data.tier}-tier limit of ${data.limit} brand${
            data.limit === 1 ? "" : "s"
          }. Upgrade in Settings → Billing to add more.`,
        );
      } else {
        setError(err instanceof Error ? err.message : "Could not create brand.");
      }
      setSubmitting(false);
    }
  };

  return (
    <form className="brand-form" onSubmit={onSubmit}>
      <label className="brand-form-label" htmlFor="brand-name">
        Brand name
      </label>
      <input
        id="brand-name"
        className="brand-form-input"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Lumen Botanicals"
        disabled={submitting}
        autoFocus
        required
      />
      {error && <p className="brand-form-error">{error}</p>}
      <button type="submit" className="brand-form-submit" disabled={submitting || !name.trim()}>
        {submitting ? "Creating…" : "Create brand"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Typecheck**

```
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add features/brand-profile/components/CreateBrandForm.tsx
git commit -m "feat(brand-profile): CreateBrandForm with quota error handling"
```

---

## Task 14: BrandSwitcher component

**Files:**
- Create: `features/brand-profile/components/BrandSwitcher.tsx`
- Modify: `app/(app)/b/[brandId]/layout.tsx` (uncomment the BrandSwitcher import)

- [ ] **Step 1: Write the component**

Create `features/brand-profile/components/BrandSwitcher.tsx`:

```tsx
"use client";

// Lives in the b/[brandId]/layout.tsx chrome. Reads brands.list (live), shows
// the active brand by name, lets the user switch to another brand or create
// a new one. Switching preserves the current sub-route (dashboard/calendar/
// analytics) so users keep their place when changing brand context.

import { useQuery } from "convex/react";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

interface Props {
  activeBrandId: Id<"brand_profiles">;
}

export function BrandSwitcher({ activeBrandId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const brands = useQuery(api.brandProfile.brands.list);
  const [open, setOpen] = useState(false);

  const subRoute = (() => {
    // pathname looks like /b/<brandId>/<subRoute...>
    const parts = pathname.split("/");
    // parts: ["", "b", "<brandId>", "<sub>", ...]
    return parts.slice(3).join("/") || "dashboard";
  })();

  const switchTo = (newBrandId: Id<"brand_profiles">) => {
    setOpen(false);
    router.push(`/b/${newBrandId}/${subRoute}`);
  };

  const goNew = () => {
    setOpen(false);
    // Reuse the onboarding screen for the "+ New brand" entry. Once the user
    // creates a second brand the redirector at /(app)/page.tsx still sends
    // them to the *oldest* brand on next bare-/ visit; that's fine — they
    // were just redirected to the new brand's dashboard from CreateBrandForm.
    router.push("/onboarding");
  };

  const active = brands?.find((b) => b._id === activeBrandId);

  return (
    <div className="brand-switcher">
      <button
        type="button"
        className="brand-switcher-button"
        onClick={() => setOpen((s) => !s)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {active?.name ?? "…"} ▾
      </button>
      {open && (
        <ul className="brand-switcher-menu" role="listbox">
          {brands?.map((b) => (
            <li key={b._id}>
              <button
                type="button"
                className={`brand-switcher-item ${b._id === activeBrandId ? "active" : ""}`}
                onClick={() => switchTo(b._id)}
              >
                {b.name}
              </button>
            </li>
          ))}
          <li>
            <button type="button" className="brand-switcher-item new" onClick={goNew}>
              + New brand
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire the BrandSwitcher into the layout**

Edit `app/(app)/b/[brandId]/layout.tsx`:

Add this import alongside the others at the top of the file:

```tsx
import { BrandSwitcher } from "@/features/brand-profile/components/BrandSwitcher";
```

Replace the placeholder comment inside `<div className="brand-chrome">`:

```tsx
{/* BrandSwitcher wired in Task 14 */}
```

with:

```tsx
<BrandSwitcher activeBrandId={brand._id} />
```

- [ ] **Step 3: Typecheck**

```
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add features/brand-profile/components/BrandSwitcher.tsx 'app/(app)/b/[brandId]/layout.tsx'
git commit -m "feat(brand-profile): BrandSwitcher with sub-route preservation"
```

---

## Task 15: Onboarding page

**Files:**
- Create: `app/(app)/onboarding/page.tsx`

- [ ] **Step 1: Write the page**

Create `app/(app)/onboarding/page.tsx`:

```tsx
"use client";

// First-brand creation screen. Shown to any signed-in user with zero brands
// (the redirector at app/(app)/page.tsx routes them here). Also reachable via
// the "+ New brand" entry in the BrandSwitcher.

import { useRouter } from "next/navigation";
import { CreateBrandForm } from "@/features/brand-profile/components/CreateBrandForm";

export default function OnboardingPage() {
  const router = useRouter();
  return (
    <div className="onboarding-page">
      <h1 className="onboarding-title">Name your first brand</h1>
      <p className="onboarding-sub">
        Brands are how OmniGrowth keeps your channels, posts, and analytics
        separate. You can create more later.
      </p>
      <CreateBrandForm
        onCreated={(brandId) => router.push(`/b/${brandId}/dashboard`)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add 'app/(app)/onboarding/page.tsx'
git commit -m "feat(onboarding): /onboarding page with first-brand form"
```

---

## Task 16: Update middleware

**Files:**
- Modify: `middleware.ts`

- [ ] **Step 1: Replace the contents of middleware.ts**

```ts
// Convex Auth Next.js middleware. Protects in-app routes (/onboarding, /b/...)
// and bounces signed-in users away from /login. Reads auth state from cookies
// set by ConvexAuthNextjsServerProvider.
//
// Brand-count resolution (zero brands → /onboarding, otherwise → /b/<oldest>)
// happens in app/(app)/page.tsx, not here. Middleware only handles
// authenticated-vs-not.

import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isLoginPage = createRouteMatcher(["/login"]);
const isProtectedRoute = createRouteMatcher(["/onboarding(.*)", "/b(.*)"]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const authed = await convexAuth.isAuthenticated();

  if (isLoginPage(request) && authed) {
    return nextjsMiddlewareRedirect(request, "/");
  }
  if (isProtectedRoute(request) && !authed) {
    return nextjsMiddlewareRedirect(request, "/login");
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
```

- [ ] **Step 2: Typecheck**

```
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat(middleware): protect /onboarding + /b/*; redirect signed-in users to /"
```

---

## Task 17: Update LoginPortfolio post-signin redirect

**Files:**
- Modify: `features/auth/components/LoginPortfolio.tsx`

- [ ] **Step 1: Find the existing redirect**

Run:

```
grep -n 'router.push("/dashboard")' features/auth/components/LoginPortfolio.tsx
```

Expected: one hit, around line 24 — `router.push("/dashboard");`.

- [ ] **Step 2: Replace it**

Edit `features/auth/components/LoginPortfolio.tsx`: change the line

```tsx
router.push("/dashboard");
```

to

```tsx
router.push("/");
```

The redirect target switches from a dead route (`/dashboard` no longer exists at top level) to the `(app)/page.tsx` redirector, which handles "0 brands → onboarding" vs "1+ brands → oldest's dashboard".

- [ ] **Step 3: Typecheck**

```
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add features/auth/components/LoginPortfolio.tsx
git commit -m "fix(auth): redirect post-signin to / (delegated to /(app)/page.tsx)"
```

---

## Task 18: End-to-end manual verification

This task is **mandatory** — `pnpm test` doesn't cover the route restructure or the auth-→-onboarding flow. Do not mark the feature complete until every check below passes in a real browser.

- [ ] **Step 1: Run lint, typecheck, and the full test suite**

```
pnpm lint
pnpm typecheck
pnpm test
```

Expected: green on all three.

- [ ] **Step 2: Start the app**

In one terminal:
```
pnpm convex dev
```

In another:
```
pnpm dev
```

Open http://localhost:3000 in a private / incognito window so cookies start clean.

- [ ] **Step 3: Verify the fresh-signup → onboarding → first brand → dashboard flow**

  1. Visit `/login`. The login portfolio should render.
  2. Toggle to Sign Up, submit a fresh email + password.
  3. Expect redirect to `/onboarding` (not `/dashboard`).
  4. Type "Test Brand" in the form. Submit.
  5. Expect redirect to `/b/<brandId>/dashboard` where `<brandId>` is a Convex `_id` (24 chars, starts with letters).
  6. The dashboard renders with the existing demo content (KPIs, queue, etc.).
  7. The BrandSwitcher in the chrome shows "Test Brand ▾".

- [ ] **Step 4: Verify returning-user flow**

  1. Sign out from the app (UI link or clear cookies).
  2. Sign back in with the same credentials.
  3. Expect redirect to `/b/<brandId>/dashboard` directly — no onboarding screen.

- [ ] **Step 5: Verify free-tier quota enforcement**

  1. While signed in (free tier, 1 brand), click the BrandSwitcher → "+ New brand".
  2. Type "Second Brand" and submit.
  3. Expect a visible error: "You've reached your free-tier limit of 1 brand. Upgrade in Settings → Billing to add more."

- [ ] **Step 6: Verify pro-tier multi-brand creation (manual tier flip)**

  1. Open the Convex dashboard → `users` table.
  2. Find the user row, edit `tier` from `"free"` to `"pro"`.
  3. Back in the app, retry "+ New brand" → "Second Brand". Should succeed and redirect to `/b/<newBrandId>/dashboard`.
  4. Click BrandSwitcher → confirm both brands listed; switch between them.
  5. Switching while on `/calendar` should land on `/b/<otherId>/calendar`, not `/b/<otherId>/dashboard`.
  6. Create a third brand. Should succeed.
  7. Try a fourth. Should fail with "You've reached your pro-tier limit of 3 brands."

- [ ] **Step 7: Verify last-brand deletion fallback**

  1. Flip tier back to `free` in the Convex dashboard.
  2. In the Convex dashboard, manually delete all `brand_profiles` rows for this user (no UI for delete in v1).
  3. Visit `/`. Expect redirect to `/onboarding`.

- [ ] **Step 8: Verify cross-user isolation**

  1. Open a *second* private window. Sign up a different user (`bob@example.com`).
  2. Bob lands on `/onboarding` (correct — he has zero brands of his own).
  3. Try to navigate Bob to `/b/<aliceBrandId>/dashboard` (paste the URL from window 1).
  4. Expect a 404 (`notFound()` from `b/[brandId]/layout.tsx`). Crucially: not "you don't have access" — that would leak existence.

- [ ] **Step 9: Verify dead-link 404s**

Visit `/dashboard` (the old top-level path). Expect a 404 — the route no longer exists. Same for `/calendar` and `/analytics`.

- [ ] **Step 10: Final commit**

If any of the steps surfaced a real bug not covered by an earlier task's tests, fix it in a follow-up commit referencing the specific check that failed. Otherwise, this task adds no code; it just gates the merge.

---

## Done criteria

- [ ] All 18 tasks marked complete.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` all green.
- [ ] Steps 3–9 of the manual verification all pass.
- [ ] No `console.log`s, `TODO`s, or commented-out blocks left in the code.
- [ ] The "Verified API surface" section in `docs/superpowers/specs/2026-05-04-brand-profile-design.md` accurately reflects what shipped.
- [ ] `features/auth/feature.config.ts` was *not* edited — the auth feature does not depend on brand-profile (it's the other way around). If you accidentally added a dependency, revert.
