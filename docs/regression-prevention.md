# OmniGrowth — Regression Prevention Strategy

**Status:** living document. Updated as we adopt or retire tools. Mirror to Coda once stable.
**Last updated:** 2026-05-08 (unified regression + app-quality rollout)

## Why this exists

In past projects we shipped features that quietly broke previous features. This document is the standing plan to stop that pattern *for this codebase*. It is opinionated and stack-specific — Vercel + Convex + Coolify + R2 + GitHub — not a generic checklist.

We accept that "completely prevent regressions" is unreachable. The realistic goal: catch regressions before users do, on the cheapest layer of the pyramid that can detect them.

## The six layers of defense

Each layer catches regressions the previous layer missed. Cheaper layers run more often.

| Layer | Catches | Runs |
|---|---|---|
| 1. Type system + lint | Syntax, type drift, dead code | On save / pre-commit |
| 2. Unit tests (Vitest) | Pure logic regressions | On save / on PR |
| 3. Integration + E2E (Playwright + convex-test) | Multi-system flow regressions | On PR + nightly |
| 4. Production canaries + monitoring (Checkly + Sentry) | What slipped past everything else | Continuously in prod |
| 5. Feature flags + safe rollout | Limit blast radius of anything that *does* slip | Per release |
| 6. App quality gates (perf, a11y, security, secrets, deps) | Slow, inaccessible, insecure code reaching `main` | On PR + continuously |

Plus three cross-cutting practices:

- **Fix-test discipline** — every bug gets a regression test before the fix.
- **AI PR review** — second pair of eyes on every PR (CodeRabbit).
- **CI gates** — nothing merges to `main` without all checks green.

## Adoption rollout — NOW / NEXT / LATER

Ranked by ROI ÷ effort, native-to-stack first. Effort estimates assume solo work.

### NOW — This week (≈4 hours total, all $0)

No-brainers: native to your stack, install-and-forget, foundational. If you only do these eight, regression risk drops in half.

| Item | Effort | ROI | Native | Why this slot |
|---|---|---|---|---|
| **GitHub Actions CI** (`biome check` + `tsc --noEmit` + `vitest run`) | 1–2h | ⭐⭐⭐⭐⭐ | ✅ GitHub | The merge gate. Without it, nothing else matters. |
| **Branch protection + Vercel Required Checks** | 15m | ⭐⭐⭐⭐⭐ | ✅ GitHub + Vercel | Makes the CI gate enforceable. |
| **Dependabot** (toggle on) | 5m | ⭐⭐⭐⭐ | ✅ GitHub built-in | Auto-PRs for vulnerable deps. Zero ongoing cost. |
| **Vercel Speed Insights** (toggle on) | 2m | ⭐⭐⭐⭐ | ✅ Vercel built-in | Real-user CWV from launch day. Cannot be backfilled. |
| **Vercel Firewall + BotID** (toggle on) | 15m | ⭐⭐⭐⭐ | ✅ Vercel built-in | DDoS + bot protection on login/signup/AI routes. |
| **Sentry** (`@sentry/nextjs` + Vercel integration + User Feedback widget) | 1h | ⭐⭐⭐⭐⭐ | ✅ Vercel integration | First time a real user hits a bug, you see it in seconds with full context. |
| **CodeRabbit** GitHub app | 15m | ⭐⭐⭐⭐ | ✅ GitHub + Vercel Marketplace | Solo = no second pair of eyes. CodeRabbit is that pair. |
| **GitGuardian** GitHub app | 15m | ⭐⭐⭐⭐ | ✅ GitHub App | One leaked OpenRouter / R2 / Convex key = day of pain. Cheap insurance. |

**Exit criteria:** A PR that breaks lint, types, or unit tests cannot merge. Production errors page Sentry. Secrets, vulnerable deps, and bot traffic are all gated automatically.

### NEXT — This month (≈6–8 hours spread out)

Higher effort, but each one rides on a Playwright smoke suite — write that first, then everything else compounds.

| Order | Item | Effort | ROI | Native | Why this slot |
|---|---|---|---|---|---|
| 1 | **Playwright smoke suite** (login + dashboard, 2–3 tests) | 2h | ⭐⭐⭐⭐⭐ | ✅ Already installed | Required input for items 2–4. Even 2 tests is enough. |
| 2 | **Checkly** — 2–3 prod canaries from your Playwright tests | 1h | ⭐⭐⭐⭐⭐ | ✅ Native Playwright | Catches env/deploy drift CI cannot see (R2 signed URL expiry, OpenRouter quota, Convex deploy mismatch). |
| 3 | **Argos** visual regression | 1h | ⭐⭐⭐⭐ | ✅ Native Playwright | Catches Tailwind collisions, missing icons, broken layouts — bugs that don't fail tests. |
| 4 | **Lighthouse CI** GH Action | 1h | ⭐⭐⭐⭐ | ✅ GH Action + Vercel preview | Gates perf + a11y + SEO budgets per PR against the preview URL. |
| 5 | **Helicone** as OpenRouter proxy | 30m | ⭐⭐⭐⭐⭐ | ⚠️ Base URL change | Once agents/OmniBits ship, every LLM call's cost+latency matters. Setup *now* before traffic ramps. |
| 6 | **knip** in CI | 30m | ⭐⭐⭐ | ✅ OSS | Modular feature codebase + refactors → dead code. knip kills it weekly. |
| 7 | **Fix-test rule + PR template** | 30m | ⭐⭐⭐⭐⭐ | ✅ GitHub | Cultural, not tooling. The single highest-ROI item on this entire list. |
| 8 | **Per-feature E2E rule** — every new `features/<name>/` ships with one happy-path test | ongoing | ⭐⭐⭐⭐ | ✅ Playwright | No exceptions for "small" features — small features are where regressions hide. |

**Exit criteria:** Median PR has unit + integration + 1 E2E. Production has 3 always-on canaries. Visual + perf budgets gate every PR. Every LLM call is observable.

### LATER — When pain demands it (don't pre-build)

Each solves a specific pain. Adopt only when the trigger fires.

| Item | Trigger to adopt | Why deferred |
|---|---|---|
| **Vercel Flags SDK + Edge Config** | First feature you'd want to kill-switch without a redeploy | No risky rollouts yet; flag fatigue is real if adopted too early |
| **`get-convex/migrations`** | First non-additive schema change (rename, drop, narrow type) | Additive changes don't need it |
| **Semgrep Community SAST** | When you handle real user data / first security review | Solo + pre-launch = low payload; CodeRabbit covers obvious issues |
| **RelativeCI** (bundle deltas) | When bundle size becomes a tracked metric | Vercel + `next/image` defaults are fine for v1 |
| **Better Stack** status page + uptime | When users start asking about uptime / first outage | No users = no status page audience |
| **Octomind** AI test generation | When *writing* E2E tests becomes the bottleneck | Right now the bottleneck is *running* them in prod (Checkly fixes that) |
| **Currents.dev / Trunk Flaky Tests** | When >5% of CI runs fail on flake | No flake yet — none to manage |
| **Statsig / PostHog experiments** | First real A/B test | No traffic to A/B with yet |
| **Cross-browser Playwright matrix** | First Safari/Firefox-only bug from a user | Chromium-only catches ~95% of bugs at v1 scale |
| **Sentry → Team plan** ($26/mo) | Teammate needs dashboard, OR errors exceed 5k/mo | Free tier is single-user |

## Cloud services shortlist (combined regression + app quality)

Verified pricing/integration as of 2026-05-08. All have first-party GitHub or Vercel integration. Phase column maps to the rollout above.

| # | Service | Phase | Link | What it does | How it helps OmniGrowth specifically | v1 cost |
|---|---|---|---|---|---|---|
| 1 | **GitHub Actions** | NOW | [github.com/features/actions](https://github.com/features/actions) | Runs your CI pipeline (lint, typecheck, tests, E2E) on every push and PR | The merge gate. No PR reaches `main` without `biome check`, `tsc`, `vitest`, and Playwright smoke passing. | $0 (2k min/mo private) |
| 2 | **Dependabot** | NOW | [github.com/dependabot](https://github.com/dependabot) | Auto-PRs to patch vulnerable / outdated deps | Just toggle on. Keeps Next.js, Convex SDK, Sentry SDK, Playwright patched. | $0 (built-in) |
| 3 | **Vercel Speed Insights** | NOW | [vercel.com/docs/speed-insights](https://vercel.com/docs/speed-insights) | Real-user Core Web Vitals (LCP, INP, CLS) | Catches "production is slow on mobile" regressions Sentry can't see — Sentry tracks server, this tracks the *browser*. | $0 (Hobby) |
| 4 | **Vercel Firewall + BotID** | NOW | [vercel.com/docs/security/vercel-firewall](https://vercel.com/docs/security/vercel-firewall) | Built-in WAF, DDoS, bot detection, edge rate limiting | Protects login, signup, post-generation, and OpenRouter-fronted routes from abuse. **Don't put Cloudflare in front of Vercel.** | $0 (built-in) |
| 5 | **Sentry** | NOW | [sentry.io](https://sentry.io/) | Captures unhandled errors + slow transactions + user feedback widget | First time a real user hits a regression in `app/(app)/**`, Sentry pages you in seconds with full context. | $0 (5k errors/mo, 1 user) |
| 6 | **CodeRabbit** | NOW | [coderabbit.ai](https://www.coderabbit.ai/) | AI reviewer that comments on every PR — flags bugs, security, missing tests, code smells | Solo = no second pair of eyes. Catches the "I forgot to handle the brand-scoped path" class of bugs before merge. | $0 (rate-limited free private) |
| 7 | **GitGuardian** | NOW | [gitguardian.com](https://www.gitguardian.com/) | Scans every commit for leaked API keys, tokens, secrets (500+ types) | If you ever paste an OpenRouter / R2 / Convex / Resend key into a config, this catches it before GitHub does. | $0 (individual dev plan) |
| 8 | **Checkly** | NEXT | [checklyhq.com](https://www.checklyhq.com/) | Runs your Playwright tests as prod canaries every N minutes from global locations | Detects regressions that only appear in prod (env drift, R2 signed-URL expiry, Convex deploy mismatch, OpenRouter quota). Reuses your existing tests. | $0 (1.5k browser + 10k API runs/mo) |
| 9 | **Argos** | NEXT | [argos-ci.com](https://argos-ci.com/) | Screenshot diff on Playwright E2E runs; flags visual changes on PRs | Catches Tailwind class collisions, missing icons, calendar grid going sideways on mobile. First-class Playwright integration. | $0 (5k screenshots/mo) |
| 10 | **Lighthouse CI** | NEXT | [github.com/GoogleChrome/lighthouse-ci](https://github.com/GoogleChrome/lighthouse-ci) | GH Action that runs Lighthouse against Vercel preview URLs; fails PR on perf/a11y/SEO budget regressions | Stops "I shipped a feature and the dashboard now scores 60 on mobile." Free a11y + SEO gate as a side effect. | $0 |
| 11 | **Helicone** | NEXT | [helicone.ai](https://www.helicone.ai/) | LLM observability proxy — logs every OpenRouter call's cost, latency, tokens, errors | Critical for OmniBits accuracy + agent debugging. Drop-in proxy, no SDK rewrite. | $0 (100k requests/mo) |
| 12 | **knip** | NEXT | [knip.dev](https://knip.dev/) | Finds unused files, exports, deps, types | Modular feature codebase + refactors = dead code accumulates. knip catches it. Replaces unmaintained ts-prune. | $0 (OSS) |
| 13 | **Vercel Flags SDK + Edge Config** | LATER | [vercel.com/docs/feature-flags](https://vercel.com/docs/feature-flags) | Feature flags toggleable from Vercel dashboard without redeploys | Adopt when you ship something you'd want to kill-switch. Until then, premature. | $0 (included in Vercel) |
| 14 | **`get-convex/migrations`** | LATER | [github.com/get-convex/migrations](https://github.com/get-convex/migrations) | Convex's official zero-downtime online schema migration component | Adopt at first non-additive schema change. Until then, additive-only changes don't need it. | $0 (OSS) |
| 15 | **Semgrep Community** | LATER | [semgrep.dev](https://semgrep.dev/) | OSS SAST that catches SSRF / XSS / injection / auth flaws via pattern rules | Adopt when handling real user data. CodeRabbit covers obvious issues until then. | $0 (Community) |
| 16 | **RelativeCI** | LATER | [relative-ci.com](https://relative-ci.com/) | PR comments with bundle-size diff vs `main`; flags JS payload regressions | Adopt when bundle size becomes a tracked metric. Vercel defaults are fine for v1. | $0 (free OSS plan) |
| 17 | **Better Stack** | LATER | [betterstack.com](https://betterstack.com/) | Uptime monitoring + status page + on-call alerts in one product | Adopt when users start asking about uptime, or first outage. | $0 (free tier) |
| 18 | **Octomind** | LATER | [octomind.dev](https://octomind.dev/) | AI generates Playwright tests by crawling your app | Adopt when *writing* E2E tests becomes the bottleneck. Currently *running* them in prod is the bottleneck (Checkly fixes that). | $0 (10 tests, 50 runs/mo) |

### Deliberately not adopted (and why)

- **testRigor / Mabl / QA Wolf** — enterprise pricing ($30k+/yr); Playwright + Checkly cover the same ground at $0.
- **Chromatic / Percy** — Argos has a better Playwright free tier; Chromatic shines for Storybook, which we don't use.
- **LogRocket / Highlight.io** — Sentry + PostHog already in stack cover errors + replays; Highlight is mid-acquisition by LaunchDarkly (Mar 2025).
- **LaunchDarkly / Statsig (paid)** — Vercel Flags is sufficient until we need experimentation analytics.
- **UptimeRobot** — free tier prohibits commercial use since Oct 2024.
- **Datadog / New Relic** — overkill cost at v1 scale.

## Process discipline (not tooling)

Tools fail without these.

### Fix-test rule
Every bug fix PR must include the regression test in the *same commit* as the fix. The test must be shown to fail on the parent commit and pass after the fix. PR description must say "regression test added" or "no test — reason: …" with explicit justification (e.g., visual-only change covered by Argos).

### One feature, one E2E
Every new feature folder under `features/<name>/` ships with at least one Playwright happy-path test in `e2e/<name>/`. No exceptions for "small" features — small features are where regressions hide.

### CI green is non-negotiable
A red `main` is a stop-the-line event. Fix or revert within 30 minutes. Never merge "I'll fix the tests in a follow-up."

### Convex schema changes are PR-gated
Schema changes to `convex/schema.ts` require: (a) the diff explicitly called out in the PR description, (b) a migration plan if the change is non-additive (renames, drops, type narrowing), (c) deploying schema *before* the code that uses it.

### AI PR review is advisory, not authoritative
CodeRabbit is a second pair of eyes — useful for catching things you missed, never sufficient on its own. Treat its comments like a junior engineer's: read, decide, ignore freely. Do not let it gate merges.

## What we still don't know

Open questions that should be revisited as the project grows:

- **R2 corruption / orphan detection** — no current strategy for catching uploaded-but-unreferenced R2 objects, or referenced-but-deleted ones. Likely a nightly Convex scheduled function.
- **Coolify worker drift** — how do we catch the render worker silently producing different output (codec change, ffmpeg version drift)? Probably a golden-file render check in the canary suite.
- **OmniBits accounting drift** — once OmniBits ledger ships, we need a daily reconciliation between billed cost and metered cost. Defer until OmniBits is finalized.
- **Cross-platform regressions (Mac vs Windows)** — current process is "the dev tries it." A Windows GitHub Actions runner job covers this for free (matrix on `runs-on: [macos-latest, windows-latest]`).

## Decision log

| Date | Decision | Reason |
|---|---|---|
| 2026-05-08 | Phased rollout chosen over comprehensive reference doc | User wants concrete starting point, frustrated by past projects breaking |
| 2026-05-08 | CodeRabbit chosen over Greptile / Cubic / Sourcery | Best free-tier private repo support; most mature Vercel integration |
| 2026-05-08 | Sentry chosen over Highlight / LogRocket | Highlight in acquisition; LogRocket overlaps with PostHog (already in stack) |
| 2026-05-08 | Argos chosen over Chromatic / Percy | Best Playwright-native free tier; we don't use Storybook |
| 2026-05-08 | Vercel Flags chosen over Statsig / LaunchDarkly | Already included in Vercel plan; sufficient for solo v1 |
| 2026-05-08 | Unified regression + app-quality rollout (NOW/NEXT/LATER) | App quality services researched separately; merging avoids duplicate phasing docs |
| 2026-05-08 | Vercel Speed Insights adopted alongside Sentry (not instead) | Sentry tracks server transactions; Speed Insights tracks browser CWV — complementary |
| 2026-05-08 | GitGuardian + Dependabot adopted; Snyk skipped | GG + Dependabot + (later) Semgrep covers the same ground free |
| 2026-05-08 | Vercel Firewall preferred over Cloudflare in front of Vercel | Vercel explicitly states Cloudflare-in-front degrades BotID |
| 2026-05-08 | Helicone chosen for LLM observability over Langfuse / LangSmith | Drop-in OpenRouter proxy; Langfuse is heavier (SDK-based); LangSmith is LangChain-coupled |
| 2026-05-08 | Lighthouse CI adopted over Calibre / SpeedCurve / DebugBear | Free GH Action covers 90% of perf+a11y+SEO budget gating |

## See also

- `docs/architecture.md` — what we're protecting
- `docs/product-overview.md` — what users expect to keep working
