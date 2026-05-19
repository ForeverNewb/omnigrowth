# Handoff — Coda bootstrap (project management surface)

**Date:** 2026-05-04 (second handoff today; the first was `2026-05-04-brand-profile.md`)
**To:** Next Claude Code session
**From:** Brand-profile v1 implementation session (just shipped)
**Project:** OmniGrowth

## Your task in one line

Create a Coda doc/page/table to host OmniGrowth's running TODO list, then seed it with the 4 outstanding follow-up items below. Use the **Coda MCP** (preferred) or **REST API** (fallback) — both are wired and waiting for you.

## Why this matters

The previous session left ~4 follow-up items in this Claude Code session's task tracker. That tracker is per-session and disappears when the conversation ends. The user wants follow-ups to live in Coda so the project's running task list survives session boundaries. Long-term plan: every future Claude Code session reads/writes Coda for TODO tracking instead of using local task state.

## What's wired up — and what's NOT

### MCP (preferred path)

`claude mcp list` shows:
```
Coda: https://coda.io/apis/mcp (HTTP) - ! Needs authentication
```

Local-scoped to this project (`~/.claude-personal/.claude.json` under `[project: /Users/junasrustia/Desktop/Omni/omnigrowth]`). **First call to any Coda tool in this session will trigger the OAuth flow** in the Claude Code TUI — the user has to approve in a browser. Don't be surprised when that prompt appears; surface it to the user clearly so they know to approve.

Available tools after OAuth: depends on what `https://coda.io/apis/mcp` exposes. At minimum: list docs, create docs/pages, create rows in tables, read rows, run formulas. Use `ToolSearch` (or whatever the equivalent is in your runtime) to discover specific tool names AFTER you OAuth — they're not visible until you authenticate.

### REST API fallback

`.env.local` has `CODA_API_TOKEN` (line ~57). The token's been pasted in chat history already, so **the user is going to rotate it after this session** — `.env.local` is git-ignored so it's only on disk. If you find the token has been rotated and the new one isn't in env yet, surface that to the user — don't grep around looking for an updated value.

REST docs: <https://coda.io/developers/apis/v1>. Auth header: `Authorization: Bearer ${CODA_API_TOKEN}`.

If the MCP OAuth is annoying or fails for any reason, the REST API is the deterministic fallback. The MCP is preferable because it's the long-term integration path (future sessions can read+write Coda without env-var management), but the REST API is fine for the bootstrap.

## What to seed into Coda

Create a doc — recommended name: **"OmniGrowth — TODOs"** (or whatever Coda calls a top-level container). Inside it create either:

- (preferred) A **table** with columns: `Title` (text), `Status` (select: Open/In progress/Done), `Area` (select: backend/frontend/auth/billing/UI/devops), `Priority` (select: P0/P1/P2/P3), `Created` (date, default today), `Notes` (long text), `Source` (text — usually a file path or PR link)

- (acceptable fallback) Just a **page** with checkbox bullets, one per TODO. Less queryable but works.

Then seed it with these 4 items, all `Status: Open`, `Created: 2026-05-04`:

| Title | Area | Priority | Notes |
|---|---|---|---|
| Harden `profile()` callback's `params.email as string` cast | auth | P3 | `convex/auth.ts:19` — Password provider's `profile` callback runs on every flow (signUp/signIn/reset/reset-verification). On non-signUp flows our `tier` is discarded but if `params.email` is undefined the cast lies. Replace with `typeof params.email === "string" ? params.email : ""` or stricter validation. Spec used the same cast (low impact). Verified by reading `node_modules/@convex-dev/auth/dist/providers/Password.js:56-127`. |
| Empty-string name validation on `brands.create` + `brands.rename` | backend | P3 | Both mutations use `v.string()` for `name`, which permits `""`. Either add server-side `v.string().min(1)` (or manual `if (!name.trim())` throw) OR trust the client's `required` attr. Apply uniformly across both mutations if changed. Spec gap, not an impl bug. |
| UI redesign: brand switcher integration + onboarding visual polish | UI | P1 | (1) `BrandSwitcher` (text dropdown in `app/(app)/dash/b/[brandId]/layout.tsx` chrome) belongs inside the prominent gold-LB studio bar on the dashboard at `features/dashboard/components/StudioSwitcher.tsx`. That component currently cycles through hardcoded fake `STUDIOS` — replace with `useQuery(api.brandProfile.brands.list)` and reuse the sub-route preservation + "+ New brand" → `/dash/onboarding` from `BrandSwitcher.tsx`. Then drop the minimal text dropdown from the layout. (2) `app/(app)/dash/onboarding/page.tsx` is rough — plain `h1` + `p` + form on default bg. Wire the polished design from the UI session into this when it lands. Functionality is locked. TODO breadcrumbs already in all three files pointing at this issue. |
| Connect Coda for project management | devops | P1 | THIS task — the act of creating the Coda surface and seeding it. Mark it `Done` once you've created the doc and added the other 3 rows above. |

After seeding, verify by reading back at least one row through whatever path you used (MCP roundtrip query, or REST GET on the row's URL).

## What's done that the next session does NOT need to redo

The brand-profile v1 feature shipped this session. Don't relitigate any of these:

- Schema (`brand_profiles` table + `users.tier` field), pushed to Convex Cloud `amiable-jay-664`
- Auth callback (`Password<DataModel>({ profile })` writing `tier: "free"` on signup)
- 5 Convex functions (`list`, `get`, `create`, `rename`, `remove`) under `convex/brandProfile/`, 15 passing convex-test integration tests
- 1 internal mutation (`updateTier` in `convex/shared/users.ts`)
- Pure quota helper (`lib/billing/tiers.ts` with `BRAND_LIMIT_BY_TIER` + `assertBrandQuotaOk`), 4 passing unit tests
- Route restructure to `/dash/...` (avoiding parallel-pages conflict with the marketing landing at `/`)
- `app/(app)/dash/page.tsx` redirector, `dash/onboarding/page.tsx`, `dash/b/[brandId]/layout.tsx` (with server-side owner check)
- `BrandSwitcher` and `CreateBrandForm` components in `features/brand-profile/components/`
- Middleware update (`/dash(.*)` protected, `/login` bounce target → `/dash`)
- LoginPortfolio post-signin redirect (`/dashboard` → `/dash`)
- Vitest + convex-test infrastructure (`vitest.config.ts`, edge-runtime, the documented `import.meta.glob` workaround for sibling-directory key normalization)
- Manual UI verification 1–7 all passed in browser

State checkpoint: `pnpm typecheck` clean, `pnpm test` 19/19, `pnpm lint` clean, `pnpm build` green.

## Repo state at session end

**This is still NOT a git repository.** The user hasn't asked to `git init` yet. Don't initialize git unless they ask. Several `git add`/`git commit` steps in the implementation plan were intentionally skipped (`docs/superpowers/plans/2026-05-04-brand-profile.md`); the changes are all on disk.

If the user wants to push to GitHub: `git init && git add . && git commit -m "initial: pre-launch state"` will capture everything in one base commit. They'll likely want a `.gitignore` first — one already exists at the repo root.

**Convex deployment is cloud `amiable-jay-664`** (was self-hosted local at session start; switched mid-session because the user prefers cloud now that auth callbacks/webhooks are coming). Auth env vars (`JWT_PRIVATE_KEY`, `JWKS`, `SITE_URL`) already pushed to cloud via `pnpm dlx convex env set`. The local backend on `:3210` may still be running on the user's machine but `.env.local` no longer points at it.

## Recommended workflow

1. **Confirm the session sees Coda.** First user message or your first action: try a trivial Coda MCP call (e.g., "list docs"). If OAuth prompt appears, surface it to the user and wait for approval. If MCP is broken, fall back to REST.
2. **Decide doc structure with the user.** Show them the table-vs-page tradeoff briefly (table is queryable from MCP/API, page is lighter). Default to table unless they push back.
3. **Create the doc + seed the 4 rows.** Roundtrip-verify by reading at least one back.
4. **Surface the rotation reminder.** Tell the user the previous session's API token is in chat history and they should rotate it in Coda's account settings, then update `.env.local` line ~57.
5. **Proactively: pick up `UI redesign` (P1).** That's the most impactful follow-up. The user has Claude Design as their visual source per `docs/handoffs/2026-05-03-ui-scaffold.md` — coordinate with that, don't invent visual design unilaterally.

## What NOT to do

- Don't `git init` without explicit user request.
- Don't push the in-chat-history `CODA_API_TOKEN` value into Coda's MCP config or anywhere remote-readable. Token only belongs in `.env.local` (git-ignored) until rotated.
- Don't recreate any of the brand-profile v1 work. It's done. Visual polish is a separate concern (see UI redesign follow-up).
- Don't hardcode the Coda doc ID anywhere yet — the user might delete + recreate the doc once they see the seed. Wait until the schema/structure is settled, then capture the doc ID in `.env.local` (e.g., `CODA_TODOS_DOC_ID=...`) for future sessions.
- Don't try to programmatically OAuth the MCP — that's the user's job in their TUI.

## What to surface to the user

- The OAuth prompt (if it triggers — likely will).
- The doc structure decision (table vs page) before creating.
- A confirmation message after each row is seeded so they can sanity-check live in Coda.
- Final ping to rotate the API token. Mention the line number in `.env.local` so it's a 5-second edit.
- If anything in the Coda MCP API surface is surprising or limits what we can store, flag it before you decide a workaround.

## Files written by THIS session (the brand-profile one)

For full audit: `pnpm exec git diff` would show this if it were a repo. Without git, here's the manifest of files this session created or modified:

**Created (new files):**
- `convex/brandProfile/brands.ts`, `convex/brandProfile/brands.test.ts`
- `features/brand-profile/schema.ts`, `feature.config.ts`, `README.md`
- `features/brand-profile/components/CreateBrandForm.tsx`, `BrandSwitcher.tsx`
- `lib/billing/tiers.ts`, `lib/billing/tiers.test.ts`
- `vitest.config.ts`
- `app/(app)/dash/page.tsx`, `dash/onboarding/page.tsx`, `dash/b/[brandId]/layout.tsx`
- `docs/superpowers/plans/2026-05-04-brand-profile.md`
- `docs/handoffs/2026-05-04-coda-bootstrap.md` (this file)

**Modified:**
- `convex/auth.ts`, `convex/schema.ts`, `convex/shared/schema.ts`, `convex/shared/users.ts`
- `middleware.ts`
- `features/auth/components/LoginPortfolio.tsx`
- `package.json`, `pnpm-lock.yaml`, `.env.local`, `.env.example`, `.mcp.json` config (via `claude mcp add`)

**Moved (no content change):**
- `app/(app)/dashboard/page.tsx` → `app/(app)/dash/b/[brandId]/dashboard/page.tsx`
- `app/(app)/calendar/page.tsx` → `app/(app)/dash/b/[brandId]/calendar/page.tsx`
- `app/(app)/analytics/page.tsx` → `app/(app)/dash/b/[brandId]/analytics/page.tsx`

**Deleted:**
- `features/auth/schema.ts` (was an empty stub)

## See also

- `docs/superpowers/plans/2026-05-04-brand-profile.md` — implementation plan that just executed
- `docs/superpowers/specs/2026-05-04-brand-profile-design.md` — v1 design spec (the source of truth)
- `docs/handoffs/2026-05-04-brand-profile.md` — the handoff that started this session
- `docs/handoffs/2026-05-03-ui-scaffold.md` — UI redesign coordination
