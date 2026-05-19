# Handoff — UI Scaffold from Claude Design

**Date:** 2026-05-03
**To:** Next Claude Code session
**From:** Brainstorming/architecture session
**Project:** OmniGrowth — marketing automation platform

## Your task in one line
Fetch the Claude Design package, read its README, and implement the relevant pages of the design — scaffolding the Next.js 16 + Convex codebase using the modular feature architecture defined in `docs/architecture.md`.

## The design source
```
https://api.anthropic.com/v1/design/h/nEBS9xII4pnWdsocKN9eOA
```

Use the prompt the user pasted to start your session:
> Fetch this design file, read its readme, and implement the relevant aspects of the design.
> https://api.anthropic.com/v1/design/h/nEBS9xII4pnWdsocKN9eOA
> Implement: the designs in this project

The design is a **multi-page sample**. The user does **not** want it implemented exactly as it appears. Use it as the **aesthetic and component reference** — especially the button styles, which the user explicitly loves and wants to keep.

## Required reading before you write any code
1. `docs/product-overview.md` — what this app is and who it's for
2. `docs/architecture.md` — **the rules. Read it twice.** Stack, repo structure, the modular feature pattern, Convex schema strategy, agent runtime, video pipeline, cross-platform dev requirements.
3. `docs/features/landing.md`, `docs/features/auth.md`, `docs/features/dashboard.md`, `docs/features/calendar.md`, `docs/features/analytics.md` — the v1 surface to actually implement.
4. The remaining `docs/features/*.md` for context (don't implement them now, but know they exist).

## What's already decided (do not re-litigate)
- **Stack:** Next.js 16 (App Router) + TypeScript, Convex + Convex Auth, OpenRouter (LLM + TTS via Gemini 3.1 TTS), Remotion + ffmpeg on Coolify, postforme.dev, Vercel app hosting, Resend, PostHog, Tailwind + shadcn/ui, pnpm, Biome, Vitest, Playwright. Always use Context7 for current API docs.
- **Repo structure:** see `docs/architecture.md`. Strictly modular under `features/<name>/`. Each feature owns its UI, hooks, lib, Convex queries, and schema fragment.
- **Auth in v1 is a dummy** stub. Real Convex Auth comes shortly after.
- **Render pipeline lives only on Coolify.** No ffmpeg or Remotion CLI installed locally.
- **OmniBits economy and tier specifics are DEFERRED.** Stub the balance widget with mock data; do not implement metering yet.
- **Coda owns project management / TODO.** No `docs/TODO.md` in the repo.
- **Cross-platform (Mac/Windows):** `.gitattributes` LF, `.editorconfig`, no `.sh` scripts, all scripts in `package.json`, `path.join` everywhere.

## Scope for this session — what to build

### v1 surface (implement these pages)
1. **Landing** (`/`) — one-pager with hero, pillars, CTA → `/login`
2. **Login** (`/login`) — dummy auth flow → `/dashboard`
3. **Dashboard** (`/dashboard`) — shell + Quick AI Post Generator widget + today's posts + OmniBits balance (mock data fine for now)
4. **Calendar** (`/calendar`) — month/week/day views, manual post creation, paste manual post, schedule slot for AI-generated post (UI only, not actual generation)
5. **Analytics** (`/analytics`) — per-post + per-channel summaries, OmniBits-consumed chart (mock data fine)

### Foundational scaffolding (set up but mostly empty)
- `features/` folder with at minimum: `landing/`, `auth/`, `dashboard/`, `post-generator/`, `calendar/`, `analytics/` — each with the standard sub-folders even if empty
- `agents/` folder with a README explaining the convention (no actual agents yet)
- `convex/` with composed schema setup (even if all schemas are empty stubs)
- `lib/openrouter/`, `lib/omnibits/`, `lib/auth/` — empty wrapper stubs
- `components/ui/` — shadcn primitives
- `.gitattributes`, `.editorconfig`, `.gitignore`
- `biome.json`, `tsconfig.json`, `package.json` with pnpm scripts only

### Out of scope for this session
- Actual OpenRouter calls
- Actual posting via postforme.dev
- Actual video rendering (no Remotion compositions, no Coolify worker)
- OmniBits metering / cost conversion
- Real Convex Auth (dummy auth only)
- Brand profile, media library, connected accounts, settings/billing pages — folders only, no UI yet
- Notifications system

## How to interpret the design
The design is the **visual language**. The user's words on it:
> The design attached is the sample, do not follow the flow exactly as it is. I need much better and beautiful design but use the aesthetics — I love it, it's unique and the buttons especially.

Translate that as:
- **Adopt:** typography, color palette, button styles, card styles, overall aesthetic
- **Adapt:** page composition / flow / information architecture should follow OUR `features/` map, not the design's page structure
- **Reject (if present in the design):** team workspaces, approval workflows, multi-user features, A/B testing UI, public API surfaces, content template marketplace — these are explicit out-of-scope for v1

## Aesthetic notes from the user
- "Unique" aesthetic
- Custom button styles are a love-it feature — preserve them faithfully
- This is a beautiful one-pager landing → dummy login → dashboard journey

## Working principles
- Follow `docs/architecture.md` strictly. If you find yourself wanting to deviate, stop and write down why; raise it for confirmation.
- Always use Context7 to verify current Next.js 16, Convex, Convex Auth, and Remotion APIs.
- Brainstorm with the user before implementing any feature where the architecture spec leaves an open question.
- Don't add features, abstractions, or fallbacks that aren't in scope.
- Cross-platform clean from day one — no `.sh` files, no hardcoded path separators, LF only.
- Prefer editing/expanding existing docs over creating new ones.

## When you're done
Before reporting completion:
1. Repo runs `pnpm dev` clean on a fresh checkout
2. All listed v1 pages render with the design aesthetic
3. Folder structure exactly matches `docs/architecture.md`
4. `pnpm lint` (Biome) and `pnpm typecheck` pass
5. `.gitattributes` + `.editorconfig` in place; no `.sh` files anywhere
6. `pnpm` scripts exist for `dev`, `build`, `lint`, `typecheck`, `test`
7. Update `docs/features/*.md` `Status:` line for each implemented feature: `stub` → `building`

## Questions to surface back to the user (don't decide unilaterally)
- Convex deployment: which org / project name? (won't block local dev — use a dev deployment)
- Vercel project name / domain
- Image generation model on OpenRouter (raised as open question in `docs/features/post-generator.md`)
- Any specifics from the design you can't reconcile with the architecture

## Files written by this brainstorming session
- `docs/product-overview.md`
- `docs/architecture.md`
- `docs/features/{landing,auth,dashboard,post-generator,calendar,analytics,brand-profile,media-library,connected-accounts,settings-billing,omnibits-economy,agent-runtime,video-pipeline,notifications}.md`
- `docs/handoffs/2026-05-03-ui-scaffold.md` (this file)

Nothing else. No code, no config, no scaffolding — that's your job.
