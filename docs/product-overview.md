# OmniGrowth — Product Overview

## Elevator pitch
OmniGrowth is a marketing automation platform that helps marketers create, schedule, and analyze social media content across multiple channels — with AI assistance that respects brand voice and never replaces creative control.

## Who it's for
Marketers running social presence across several channels who want to compress time-to-publish without sacrificing brand voice. They write some posts themselves, want AI to draft others, and need a single calendar + analytics view across their accounts.

## Core problems we solve
1. **Post creation is slow.** Copy, image, and video each take time and tools.
2. **Brand voice drifts when moving fast.** Generic AI output sounds off-brand.
3. **Scheduling is fragmented.** Cross-platform calendars are clunky.
4. **Existing tools over- or under-automate.** Either the AI takes over or it does nothing useful.
5. **Premade video assets sit unused.** No easy way to remix them into platform-ready content.

## Product pillars
- **AI-assisted, not AI-only.** Manual creation is first-class.
- **Brand-aware generation.** Every AI feature reads the user's brand profile.
- **Programmatic video.** Premade clips + AI script + narration → finished video.
- **Modular architecture.** Features can be added or removed without touching others.
- **OmniBits economy.** Predictable token-based metering hides raw LLM cost from users.

## Capabilities at a glance
Post generation (text / image / video) · Calendar & scheduling · Analytics · Brand profile · Media library · Connected social accounts · LLM agent runtime · OmniBits subscription tiers

## Out of scope (for now)
Team / multi-user workspaces · Approval workflows · A/B testing of variants · Public API · Content templates marketplace

## Stack at a glance
Next.js 16 · TypeScript · Convex · Convex Auth · OpenRouter (LLM + TTS) · Remotion + ffmpeg (Coolify-hosted render worker) · Cloudflare R2 (media storage + CDN) · postforme.dev · Vercel · Resend · PostHog · Tailwind + shadcn/ui · pnpm · Biome · Vitest · Playwright · Context7

## See also
- `architecture.md` — system architecture
- `features/` — individual feature specs
