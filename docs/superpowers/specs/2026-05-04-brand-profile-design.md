# Brand Profile — v1 Design

**Status:** approved-for-planning
**Date:** 2026-05-04
**Owner feature:** `features/brand-profile/`

## Purpose
Land the brand-profile feature as the workspace / isolation boundary that every other user-facing feature in OmniGrowth (post-generator, calendar, analytics, connected-accounts) hangs off of. Replace the empty stub at `features/brand-profile/` with a real schema, CRUD layer, onboarding gate, and brand-aware route structure.

## Why now
- All feature schemas (`postGeneratorSchema`, `calendarSchema`, `analyticsSchema`, etc.) are empty stubs. They cannot land usefully until the ownership key (`brandId`) exists.
- Convex Auth is wired with the Password provider; signed-in users currently land on `/dashboard` with nothing scoped underneath.
- Per `docs/features/brand-profile.md` (updated 2026-05-04), brand profile is now a multi-tenant concept: one user can own many brand profiles, each isolating its own connected accounts, posts, calendar, analytics, and generation jobs.

## Decisions locked during brainstorming
1. **Tenancy:** user → many brand_profiles → many of everything else.
2. **Schema scope:** minimal v1 — `name`, `description`, `voice` (all free text), `userId`, timestamps. No logo, colors, audience, do's/don'ts, or per-channel overrides in v1.
3. **Onboarding gate:** derived from "user has zero brand profiles" — no flag on the user record.
4. **URL pattern:** `/b/[brandId]/...` using the Convex `_id`. No slugs in v1.
5. **Login redirect:** to the user's oldest brand by `createdAt`. No `lastActiveBrandId` field in v1.
6. **User record extension:** add `tier: "free" | "pro" | "agency"` only. Default `"free"` written by the Password provider's `profile` callback.
7. **FK pattern for downstream brand-scoped tables:** `brandId`-only. No denormalised `userId`. Auth check happens once at the brand boundary.
8. **Tier quota:** hardcoded constants map (`free: 1, pro: 3, agency: 10`). Enforced on brand creation. Manual `tier` flips in the Convex dashboard for dev-time multi-brand testing.
9. **Cascade on brand delete:** owning mutation deletes every row in every brand-scoped table where `brandId = X`, in the same transaction. Convention applied to all future brand-scoped tables.

## Architecture

### Schema fragments

**`features/brand-profile/schema.ts`** (replaces empty stub)
```ts
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

**`convex/shared/schema.ts`** (extended; replaces current spread-only file)
```ts
import { authTables } from "@convex-dev/auth/server";
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const sharedSchema = {
  ...authTables,
  // Override the default users table to add `tier`. All default Convex Auth
  // user fields must be re-declared here, or the auth library breaks.
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
  })
    .index("email", ["email"])
    .index("phone", ["phone"]),
} as const;
```

**`convex/schema.ts`** — replace the `authSchema` stub spread with `brandProfileSchema`:
```ts
import { brandProfileSchema } from "@/features/brand-profile/schema";
// ...
export default defineSchema({
  ...sharedSchema,
  ...landingSchema,
  ...brandProfileSchema,   // <- was authSchema, which is now empty/removed
  ...dashboardSchema,
  ...postGeneratorSchema,
  ...calendarSchema,
  ...analyticsSchema,
});
```
The `features/auth/schema.ts` stub is deleted; `convex/schema.ts` no longer imports `authSchema`. Auth tables live in `sharedSchema` (already do today).

### Tier quota constants

**`lib/billing/tiers.ts`** (new)
```ts
export const BRAND_LIMIT_BY_TIER = {
  free: 1,
  pro: 3,
  agency: 10,
} as const;

export type Tier = keyof typeof BRAND_LIMIT_BY_TIER;
```

Why `lib/billing/` and not inside `features/brand-profile/`: the constants are read by the brand-profile mutation today, and will be read by `features/settings-billing/` when it lands. `lib/` is the right home per `docs/architecture.md` rule #4.

### Convex queries & mutations

**`features/brand-profile/convex/brands.ts`** (new)

Five entry points:

1. **`list`** (query) — returns the current user's brand profiles ordered by `createdAt` ascending. Reads via the `by_user` index. Returns `[]` for fresh users.

2. **`get`** (query, args: `{ brandId }`) — returns one brand profile if and only if the current user owns it. Returns `null` if not found *or* if the user doesn't own it (don't leak existence).

3. **`create`** (mutation) — server-side flow:
   - **Args validator:** `{ name: v.string(), description: v.optional(v.string()), voice: v.optional(v.string()) }`. The mutation defaults missing `description` and `voice` to `""` before insert (the schema requires them as non-optional `v.string()`; the optional args are a UX convenience for the onboarding form, which only collects `name` in v1).
   - `getAuthUserId(ctx)` — must be non-null; otherwise throw `new ConvexError("UNAUTHENTICATED")`.
   - Look up the user record; read `tier`.
   - Count brands owned by this user via the `by_user` index.
   - If count >= `BRAND_LIMIT_BY_TIER[user.tier]`, throw `new ConvexError({ code: "BRAND_QUOTA_EXCEEDED", limit: BRAND_LIMIT_BY_TIER[user.tier], tier: user.tier })`.
   - Insert with `createdAt = updatedAt = Date.now()`.
   - Return the new `brandId`.

4. **`rename`** (mutation, args: `{ brandId, name }`) — owner check, then patch `{ name, updatedAt }`.

5. **`remove`** (mutation, args: `{ brandId }`) — owner check, then **cascade delete**. v1 has no downstream brand-scoped tables yet, so the cascade is a no-op call site today, but the function explicitly walks each registered brand-scoped table (none yet) before deleting the brand row. We document the convention so future feature schemas plug in here.

   For v1, the function is just:
   ```ts
   // CASCADE EXTENSION POINT — every future brand-scoped table must have its
   // rows-by-brandId deleted here before the brand itself is removed.
   await ctx.db.delete(brandId);
   ```
   When the calendar / post-generator / analytics schemas land, each adds the
   appropriate `for (const row of await ctx.db.query("X").withIndex(...).collect()) ctx.db.delete(row._id)` block above the brand delete.

**`convex/shared/users.ts`** (extend existing file)

The current `viewer` query stays. Add:

- **`updateTier`** (internal mutation, args: `{ userId, tier }`) — used by future billing webhook *and* a dev-only Convex action to flip your own tier from a console. Internal-only so it's not exposed to clients.

### Auth signup hook — writing `tier: "free"` on user creation

`convex/auth.ts` is updated to attach a `profile` callback to the Password provider. Verified against `/get-convex/convex-auth` docs (2026-05-04): the callback signature is `profile(params, ctx)`, and parametrising `Password<DataModel>(...)` gives strict type checking on the returned fields against the overridden `users` table:

```ts
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { DataModel } from "./_generated/dataModel";

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

`ctx` is unused in v1 (the `tier` default is a constant), so it's underscored. We do not use `createOrUpdateUser` on the `convexAuth({...})` config — that callback would replace the library's default user-creation logic entirely; we only want to *augment* it with `tier`, which is exactly what the per-provider `profile` callback is for.

### Active brand resolution (server + client)

Active brand is **always** read from the URL — `app/(app)/b/[brandId]/...`. No cookie, no React context, no Convex field.

**Server components** read `params.brandId` from the route, then call `api.brandProfile.brands.get({ brandId })`. If `null`, render a 404 (the route guard below catches the wrong-owner case before it gets here).

**Client components** read `brandId` via `useParams()` from `next/navigation`. They subscribe to `api.brandProfile.brands.get` to get the live brand record. No project-local hook is needed for v1 — `useParams()` + a `useQuery` line is enough.

### Onboarding flow

Three states for a signed-in user, resolved by `middleware.ts`:

| State                                          | Where they should land                |
|------------------------------------------------|---------------------------------------|
| Authed, zero brands                            | `/onboarding`                         |
| Authed, 1+ brands, on `/onboarding`            | `/b/[oldestBrandId]/dashboard`        |
| Authed, 1+ brands, on bare `/`                 | `/b/[oldestBrandId]/dashboard`        |

(Top-level `/dashboard`, `/calendar`, `/analytics` no longer exist after the route restructure — direct hits 404. Bookmarks pointing at the old paths are not preserved; this is acceptable for v1 since there are no real users yet.)

The middleware can't query Convex directly cheaply, so brand-count resolution is a server component concern, not a middleware concern. Middleware only handles signed-in vs signed-out (as it does today). Concretely:

- `middleware.ts` — protected matcher becomes `/onboarding(.*)` and `/b/(.*)` (the previous `/dashboard`, `/calendar`, `/analytics` matchers are removed). The existing "redirect signed-in users away from `/login`" branch keeps its logic but its redirect target changes from `/dashboard` to `/` — `app/(app)/page.tsx` then resolves the rest (onboarding vs first-brand redirect).
- A new server component at `app/(app)/page.tsx` (the bare `/` inside the app group) calls `api.brandProfile.brands.list`. If the result is empty, it `redirect("/onboarding")`. Otherwise it `redirect(\`/b/${brands[0]._id}/dashboard\`)`.
- `app/(app)/onboarding/page.tsx` renders the brand-creation form. On submit, it calls `api.brandProfile.brands.create` and then `router.push(\`/b/${newBrandId}/dashboard\`)`.

### Route restructure

Current:
```
app/(app)/dashboard/
app/(app)/calendar/
app/(app)/analytics/
app/(app)/layout.tsx
app/(app)/template.tsx
```

After:
```
app/(app)/page.tsx                          # redirector (see Onboarding flow)
app/(app)/layout.tsx                        # unchanged (auth chrome)
app/(app)/template.tsx                      # unchanged
app/(app)/onboarding/page.tsx               # name-your-first-brand
app/(app)/b/[brandId]/layout.tsx            # owner-check + brand chrome (switcher)
app/(app)/b/[brandId]/dashboard/page.tsx    # moved from app/(app)/dashboard/
app/(app)/b/[brandId]/calendar/page.tsx     # moved from app/(app)/calendar/
app/(app)/b/[brandId]/analytics/page.tsx    # moved from app/(app)/analytics/
```

**`app/(app)/b/[brandId]/layout.tsx`** is the *single* place where brand ownership is verified server-side (calls `api.brandProfile.brands.get`; if null, `notFound()`). Every page under `b/[brandId]/` inherits that guarantee. This is the structural reason the `brandId`-only FK pattern is safe: ownership is verified once at the route boundary, downstream queries trust the `brandId`.

### Brand switcher UI

Lives in the `b/[brandId]/layout.tsx` chrome. Reads `api.brandProfile.brands.list`. Renders a dropdown with the brand names and a "+ New brand" entry. Selecting a brand navigates to `/b/[newBrandId]/<currentSubroute>` — preserves which page the user was on (dashboard → dashboard, calendar → calendar) when switching context.

**v1 styling note:** matches the design system being scaffolded out of band (see `docs/handoffs/2026-05-03-ui-scaffold.md`). Concrete shadcn components TBD by the UI session.

## Components

| Path                                                       | Purpose                                            |
|------------------------------------------------------------|----------------------------------------------------|
| `features/brand-profile/schema.ts`                         | `brand_profiles` table + `by_user` index           |
| `features/brand-profile/convex/brands.ts`                  | list / get / create / rename / remove              |
| `features/brand-profile/components/BrandSwitcher.tsx`      | dropdown in app chrome                             |
| `features/brand-profile/components/CreateBrandForm.tsx`    | used by `/onboarding` and the "+ New brand" entry  |
| `features/brand-profile/feature.config.ts`                 | name, version, depends-on `[auth, settings-billing]` |
| `lib/billing/tiers.ts`                                     | `BRAND_LIMIT_BY_TIER` constants map                |
| `convex/shared/schema.ts`                                  | extended `users` table with `tier`                 |
| `convex/shared/users.ts`                                   | adds internal `updateTier` mutation                |
| `convex/auth.ts`                                           | adds `Password({ profile })` callback              |
| `convex/schema.ts`                                         | imports `brandProfileSchema`; drops `authSchema` import |
| `app/(app)/page.tsx`                                       | redirect onboarding/dashboard                      |
| `app/(app)/onboarding/page.tsx`                            | first-brand form                                   |
| `app/(app)/b/[brandId]/layout.tsx`                         | owner check + chrome with `BrandSwitcher`          |
| `app/(app)/b/[brandId]/dashboard/page.tsx`                 | moved                                              |
| `app/(app)/b/[brandId]/calendar/page.tsx`                  | moved                                              |
| `app/(app)/b/[brandId]/analytics/page.tsx`                 | moved                                              |
| `middleware.ts`                                            | matcher changes to `/onboarding(.*)`, `/b/(.*)`    |

Removals: `features/auth/schema.ts` (empty stub no longer imported); `app/(app)/dashboard/`, `app/(app)/calendar/`, `app/(app)/analytics/` (moved under `b/[brandId]/`).

## Data flow

**Signup → first brand → dashboard**
1. User submits the signup form. Convex Auth's Password provider creates the `users` row with `email` + `tier: "free"` via the `profile` callback.
2. Middleware sees they're authenticated; permits navigation.
3. They land on `/`. Server component `app/(app)/page.tsx` calls `brands.list` → `[]` → `redirect("/onboarding")`.
4. Onboarding form posts `brands.create({ name, description: "", voice: "" })`. Quota check: `0 < 1` (free tier) → passes. Insert. Returns `brandId`.
5. Client redirects to `/b/[brandId]/dashboard`.
6. `b/[brandId]/layout.tsx` calls `brands.get` → owner verified → renders dashboard chrome.

**Returning user → dashboard**
1. Middleware confirms auth.
2. `app/(app)/page.tsx` calls `brands.list` → returns 1+ brands → redirects to oldest's dashboard.

**Multi-brand user switches brand**
1. `BrandSwitcher` reads brand list (already cached from layout subscription).
2. User clicks "Brand B" while on `/b/A/calendar`.
3. Switcher pushes `/b/B/calendar`.
4. New `b/[brandId]/layout.tsx` instance mounts; `brands.get` verifies ownership of B; renders.

**Quota-blocked brand creation (free tier, second brand)**
1. User clicks "+ New brand", fills form, submits.
2. `brands.create` runs server-side, counts → `1 >= 1` → throws `"BRAND_QUOTA_EXCEEDED"`.
3. Form catches the error, shows "You've reached your free-tier limit of 1 brand. Upgrade to add more." with a link to settings/billing (route exists as a stub).

**Manual tier flip (dev workflow)**
1. Dev opens Convex dashboard → `users` table → finds their row.
2. Edits `tier` from `"free"` → `"pro"`.
3. Next call to `brands.create` reads the new tier and lets the dev create a second brand.
4. (Once `settings-billing` lands, `updateTier` will be called by the Stripe webhook instead.)

## Error handling

All thrown errors are `ConvexError` instances with a structured payload (`{ code, ...context }`) so the client can branch on `code` rather than parse strings. Plain `throw new Error(...)` is not used.

- **Unauthenticated request to a brand-scoped query/mutation** — `getAuthUserId` returns `null`; throw `new ConvexError({ code: "UNAUTHENTICATED" })`. Middleware should have already redirected, so this is defence-in-depth.
- **Wrong-owner read (`brands.get`)** — return `null` (not throw), so existence isn't leaked to attackers probing IDs. `b/[brandId]/layout.tsx` calls `notFound()` on `null`.
- **Wrong-owner mutation (`brands.rename`, `brands.remove`)** — throw `new ConvexError({ code: "NOT_FOUND" })`. (No leak risk here: mutations require the same auth as reads, and the failure mode is identical to "brand truly doesn't exist".)
- **Quota exceeded** — `new ConvexError({ code: "BRAND_QUOTA_EXCEEDED", limit, tier })`. The form-level catch shows an upgrade-path message; no system-level error.
- **Last-brand deletion** — allowed; the user falls back into onboarding next time they hit `/`. This is a deliberate consequence of the "onboarding state is derived from brand count" decision and is not an error.

## Testing

The repo has Vitest configured (per `docs/architecture.md`). For v1 scope:

- **Unit (Vitest, Convex-test where helpful):**
  - `brands.create` enforces the quota (insert one, second insert throws).
  - `brands.create` writes `tier`-default-aware behaviour: a `pro` user can create up to 3.
  - `brands.get` returns `null` when the caller is not the owner.
  - `brands.remove` deletes the row.
- **Integration (Playwright, deferred until UI lands):** signup → onboarding → first brand → dashboard happy path. Recorded as a Playwright spec stub, not run in this implementation cycle.

No tests for the route restructure itself (Next.js handles it); manual verification per `docs/architecture.md`'s "test in a browser before reporting complete" rule.

## Out of scope (v1, captured here so they don't slip in)
- Logo, colors, audience, do's/don'ts, per-channel tone overrides on `brand_profiles`.
- `lastActiveBrandId` on the user.
- Slug-based URLs.
- Soft delete / restore for brand profiles.
- Cross-brand views (e.g. agency overview).
- Sharing a brand with another user.
- Auto-extraction of brand voice from existing posts.
- A real billing webhook into `users.tier`.
- Cascade deletion of downstream tables (no downstream tables exist yet — convention only).

## Verified API surface (Context7, 2026-05-04)

Both implementation-time questions were resolved by fetching the live `@convex-dev/auth` docs (`/get-convex/convex-auth`) before writing code:

- **`Password({ profile })` callback exists and is the right hook.** Signature: `profile(params, ctx)`. Returning extra fields beyond `email` writes them into the new `users` row at signup. Parametrising `Password<DataModel>` gives type-safe field checking against the overridden `users` table.
- **No spread-friendly helper for the `users` override.** The docs example explicitly re-declares every default field verbatim before adding custom fields, identical to the form used in this spec. Keep the verbose declaration.

## See also
- `docs/architecture.md` — modular pattern, repo structure, tenancy section
- `docs/features/brand-profile.md` — feature-level spec (multi-brand model, tier quotas, onboarding hook)
- `docs/features/auth.md` — onboarding ties auth to first-brand creation
- `docs/features/settings-billing.md` — tier dimensions; brand-profile cap is one of them
