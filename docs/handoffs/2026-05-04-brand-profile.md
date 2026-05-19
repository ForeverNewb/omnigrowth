# Handoff — Brand Profile (v1) Implementation

**Date:** 2026-05-04
**To:** Next Claude Code session
**From:** Brainstorming + spec session (this one ended after writing the spec)
**Project:** OmniGrowth — marketing automation platform

## Your task in one line
Lock the two `verify-at-implementation` items in the spec by **calling Context7 for the latest `@convex-dev/auth` API surface**, then invoke the `superpowers:writing-plans` skill to produce the implementation plan from the design doc, then implement.

## The spec is already written
**Read this first, end-to-end:** `docs/superpowers/specs/2026-05-04-brand-profile-design.md`

It is the canonical design. Do not re-design — only refine the two open items below using current docs.

## Context7 is now wired — use it before writing code

Earlier in this session Context7 was misconfigured: `.mcp.json` references `${CONTEXT7_API_KEY}` (a shell env var), but the key was only in `.env.local` (read by Next.js, not by Claude Code's MCP loader). The fix has been applied:

- `~/.zshenv` now exports `CONTEXT7_API_KEY` (verified working in fresh zsh shells).
- This session could not re-fetch via Context7 because the MCP subprocess inherited the old env at Claude Code launch.
- **You should be running in a freshly restarted Claude Code, so Context7 will work for you.** Verify with a trivial call (`mcp__context7__resolve-library-id` for any library) before relying on it.

If Context7 still returns `"Unauthorized ... ${CONTEXT7...KEY}"`, the env var didn't propagate. Tell the user — don't proceed without it (or fall back to a manual `WebFetch` of the docs site, but that's a degraded path).

### Two specific things to verify via Context7 before writing code

These are the open items in `docs/superpowers/specs/2026-05-04-brand-profile-design.md` "Open / verify-at-implementation" section:

1. **Password provider — custom user fields on signup.**
   The spec assumes:
   ```ts
   Password({
     profile(params) {
       return { email: params.email as string, tier: "free" as const };
     },
   })
   ```
   Verify the exact callback name and signature in the current `@convex-dev/auth` version (Context7: `/get-convex/convex-auth`, also reference `/get-convex/convex-auth-example` for a working example). If `profile` is renamed/moved, the alternative is `createOrUpdateUser` on the `convexAuth({ ... })` config.

2. **Users table override pattern.**
   The spec re-declares all Convex Auth default user fields verbatim alongside our `tier` field. Verify whether the library exposes a spread-friendly helper (e.g. `authTables.users.validator.fields`) so we can write `defineTable({ ...authTables.users.validator.fields, tier: ... })` instead of the long re-declaration. If yes, simplify before implementing. If no, keep the verbose form.

After verifying, edit the spec to remove or update the "Open / verify-at-implementation" section, then commit that edit alongside the implementation.

## Required reading before you write any code (in order)
1. `docs/superpowers/specs/2026-05-04-brand-profile-design.md` — **the spec.** Read it twice.
2. `docs/architecture.md` — repo structure, modular pattern, the new "Tenancy model" section. **Rule #4 (`lib/` is for cross-cutting only)** justifies why `lib/billing/tiers.ts` is the right home for `BRAND_LIMIT_BY_TIER`.
3. `docs/features/brand-profile.md` — the multi-brand model, tier quota table, onboarding hook (updated this session).
4. `docs/features/auth.md`, `docs/features/settings-billing.md` — connected docs (also updated this session).
5. `convex/auth.ts`, `convex/shared/schema.ts`, `convex/shared/users.ts`, `middleware.ts` — current Convex Auth wiring you'll be modifying.
6. `features/auth/feature.config.ts` — pattern for the `feature.config.ts` you'll write for brand-profile.

## What's already decided (do NOT re-litigate)
These were brainstormed and locked. Re-opening them wastes the user's time.

- **Tenancy:** user → many `brand_profiles` → many of everything else. `brandId`-only FK on every brand-scoped downstream table.
- **Schema scope:** minimal — `name`, `description`, `voice` (free text strings, may be `""`), `userId`, `createdAt`, `updatedAt`. **No** logo, colors, audience, do's/don'ts, or per-channel overrides in v1.
- **URL pattern:** `/b/[brandId]/...` using Convex `_id`. No slugs.
- **Login redirect:** to oldest brand by `createdAt`. No `lastActiveBrandId`.
- **Onboarding gate:** derived from "user has zero brands". No `onboardingComplete` flag.
- **User extension:** `tier: "free" | "pro" | "agency"` only. Set to `"free"` on signup via the Password `profile` callback.
- **Tier quota:** `free: 1, pro: 3, agency: 10`. Hardcoded constants in `lib/billing/tiers.ts`. Manual flips in the Convex dashboard for dev testing.
- **Cascade on brand delete:** the `brands.remove` mutation walks every brand-scoped table and deletes rows where `brandId = X`, then deletes the brand. v1 has no downstream brand-scoped tables yet, so the cascade is a documented extension point.
- **Errors:** all thrown errors are `ConvexError` with structured `{ code, ...context }` payloads. No plain `throw new Error(...)`.

## State of the repo at session end

**What changed in this session (already committed mentally — verify with `git status`):**
- `docs/architecture.md` — added "Tenancy model" section; updated non-goals to clarify multi-brand-per-user is in scope.
- `docs/features/brand-profile.md` — full rewrite for multi-brand + tier quotas + onboarding hook.
- `docs/features/settings-billing.md` — added "Tier dimensions" section (brand profiles + OmniBits).
- `docs/features/auth.md` — onboarding now requires first brand creation; added `brand-profile` to depends-on; removed stale "dummy login" line.
- `docs/features/connected-accounts.md` — connected accounts are brand-scoped, not user-scoped.
- `docs/features/calendar.md`, `analytics.md`, `post-generator.md`, `dashboard.md` — added scope-boundary section: each operates on the active brand.
- `docs/superpowers/specs/2026-05-04-brand-profile-design.md` — **the spec.**
- `~/.zshenv` — added `export CONTEXT7_API_KEY=...` so Context7 MCP works after restart.

**What did NOT change (no code or schema changes yet):**
- `convex/schema.ts` — still spreads the empty stubs.
- `convex/shared/schema.ts` — still just `...authTables`, no `users` override.
- `convex/auth.ts` — still `Password` with no profile callback.
- `features/brand-profile/` — does not exist yet (this is on you to create).
- `features/auth/schema.ts` — empty stub still imported by `convex/schema.ts`.
- `app/(app)/dashboard/`, `app/(app)/calendar/`, `app/(app)/analytics/` — still in their old top-level positions.
- `middleware.ts` — still matches the old top-level routes.

## Recommended workflow for your session

1. **Sanity-check Context7.** Run `mcp__context7__resolve-library-id` for `convex auth`. If it works, you're good. If not, surface to user.
2. **Lock the two open items** by fetching `/get-convex/convex-auth` (and `/get-convex/convex-auth-example`) docs. Edit the spec to reflect the verified API. Commit.
3. **Invoke the `superpowers:writing-plans` skill** with the spec as input. The skill will produce a concrete implementation plan.
4. **Execute the plan** — likely via `superpowers:executing-plans` or `superpowers:test-driven-development`, depending on what writing-plans recommends.
5. **Manual UI verification** before claiming done (per `docs/architecture.md` "test in a browser" rule):
   - Sign up a fresh user → onboarding screen renders → name a brand → land on `/b/[brandId]/dashboard`.
   - Sign in as an existing user with one brand → land on that brand's dashboard.
   - As a `pro` tier user, create three brands → fourth attempt shows quota error.
   - Delete the only brand → next visit goes back to onboarding.
   - Switch brands via the BrandSwitcher → URL updates, page content updates, ownership re-verified server-side.

## Things you must not do
- Do not extend the schema beyond what's in the spec (no logo/colors/audience/etc. — those are explicitly out of scope).
- Do not introduce a `lastActiveBrandId` field, an `onboardingComplete` flag, slugs, or denormalized `userId` on downstream tables. Those were considered and rejected.
- Do not skip the Context7 verification step for the Convex Auth API. The spec carries that as an open item for a reason.
- Do not hardcode `CONTEXT7_API_KEY` into `.mcp.json` — that file is tracked in git and would leak the key.
- Do not create new top-level `app/` routes for `/dashboard`, `/calendar`, `/analytics`. They live under `app/(app)/b/[brandId]/`.

## What to surface to the user
- If Context7 still fails to authenticate after restart.
- If the live `@convex-dev/auth` API differs from the spec in any non-trivial way (more than a renamed callback).
- If `pnpm typecheck` complains about the `users` override (might mean Convex Auth's expected `users` shape changed since the spec was written).
- Any UI styling decisions — the user runs UI design out-of-band per `docs/handoffs/2026-05-03-ui-scaffold.md` and the project memory note about Claude Design as the visual source. Don't invent visual styles; use existing shadcn primitives + the established button styles in `components/ui/`.

## Files written by this session
- `docs/architecture.md` (edited)
- `docs/features/brand-profile.md` (rewritten)
- `docs/features/settings-billing.md` (edited)
- `docs/features/auth.md` (edited)
- `docs/features/connected-accounts.md` (edited)
- `docs/features/calendar.md` (edited)
- `docs/features/analytics.md` (edited)
- `docs/features/post-generator.md` (edited)
- `docs/features/dashboard.md` (edited)
- `docs/superpowers/specs/2026-05-04-brand-profile-design.md` (new)
- `docs/handoffs/2026-05-04-brand-profile.md` (this file, new)
- `~/.zshenv` (edited — added `CONTEXT7_API_KEY` export)

Nothing else. All code changes are your responsibility.
