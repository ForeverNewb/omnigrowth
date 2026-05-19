# OmniGrowth — Architecture

This document is the foundational architecture for OmniGrowth. It describes the stack, repo structure, modular feature pattern, runtime systems (agents, video pipeline, OmniBits), and the dev environment. Per-feature deep specs live under `features/`.

## Goals
- Modular features that can be added or removed cleanly.
- Single shared database (Convex), but each feature owns its tables.
- One LLM gateway (OpenRouter) abstracted into an internal currency (OmniBits).
- Cross-platform dev (Mac / Windows) without per-OS workarounds.
- Agents are first-class, folder-structured, and discoverable.

## Non-goals
- Multi-user workspaces (deferred). A user can own many brand profiles, but a brand profile cannot be shared across users.
- Self-hosted full deployment — Vercel for the app, Coolify for the render worker (CPU only), Cloudflare R2 for media storage.
- Building our own LLM / TTS stack — OpenRouter handles routing.

## Tenancy model
A **user** is the auth + billing identity. A **brand profile** is the workspace / isolation boundary for everything user-facing (connected accounts, posts, drafts, calendar entries, analytics, generation jobs). One user can own many brand profiles; the count is tier-gated (see `features/brand-profile.md` and `features/settings-billing.md`). The active brand is carried in the URL (`/b/[brandId]/...`), so every protected route is naturally brand-scoped.

What stays at the user level (shared across brands): auth identity, subscription tier, OmniBits wallet, billing history.

## Stack
| Concern              | Choice                                              |
|----------------------|-----------------------------------------------------|
| Frontend framework   | Next.js 16 (App Router) + TypeScript                |
| Database & realtime  | Convex                                              |
| Auth                 | Convex Auth (dummy stub for v1, swap shortly after) |
| LLM gateway          | OpenRouter                                          |
| TTS                  | OpenRouter (Gemini 3.1 TTS)                         |
| Video composition    | Remotion                                            |
| Video encoding       | ffmpeg                                              |
| Render worker (CPU)  | Coolify (user's Hetzner server, render only)        |
| Media / blob storage | Cloudflare R2 (S3-compatible, free egress + CDN)    |
| App hosting          | Vercel                                              |
| Email                | Resend                                              |
| Product analytics    | PostHog (free tier; self-host later if needed)      |
| Social posting       | postforme.dev                                       |
| UI                   | Tailwind + shadcn/ui                                |
| Package manager      | pnpm                                                |
| Lint + format        | Biome                                               |
| Unit tests           | Vitest                                              |
| E2E tests            | Playwright                                          |
| Docs reference       | Context7 (always-on for current API docs)           |

## Repo structure
```
omnigrowth/
├── app/                       # Next.js routes — thin, just composition
│   ├── (marketing)/page.tsx   # landing
│   ├── (auth)/login/
│   └── (app)/
│       ├── dashboard/
│       ├── calendar/
│       └── analytics/
│
├── features/                  # ← Modular boundary. One folder per feature.
│   ├── post-generator/
│   ├── calendar/
│   ├── analytics/
│   ├── brand-profile/
│   ├── media-library/
│   ├── connected-accounts/
│   ├── settings-billing/
│   └── ...
│
├── agents/                    # LLM agents — same convention as features
│   ├── research/
│   ├── post-writer/
│   └── ...
│
├── convex/                    # Convex root
│   ├── schema.ts              # composes per-feature schemas
│   ├── shared/                # cross-feature: users, sessions
│   └── _generated/
│
├── lib/                       # truly cross-cutting infra
│   ├── omnibits/              # metering wrapper
│   ├── openrouter/            # OpenRouter client
│   └── auth/
│
├── components/ui/             # shared shadcn primitives only
└── docs/
```

## Per-feature folder convention
Each `features/<name>/` is self-contained:
```
features/<name>/
├── components/         # UI specific to this feature
├── hooks/              # React hooks
├── lib/                # business logic
├── convex/             # this feature's queries / mutations
├── schema.ts           # this feature's tables (prefixed: postgen_jobs, calendar_events)
├── feature.config.ts   # name, version, dependencies, enabled flag
└── README.md           # mirrors docs/features/<name>.md
```

## Five rules of the modular pattern
1. **Each feature is self-contained.** UI, hooks, business logic, and its own schema fragment all live inside.
2. **`app/` is thin.** Routes only compose `features/` exports. No business logic in `app/`.
3. **Convex schema is composed**, not centralized. Root `schema.ts` imports per-feature schemas and merges them.
4. **`lib/` is reserved for things every feature uses.** OmniBits, OpenRouter client, auth helpers. Otherwise the code stays inside the feature.
5. **Agents follow the same convention** under `agents/`.

## Adding a feature
1. Create `features/<name>/` with the standard folder layout.
2. Add `features/<name>/schema.ts` exporting your tables (prefixed `<name>_`).
3. Import that schema into `convex/schema.ts` and spread it into `defineSchema`.
4. Add a stub doc at `docs/features/<name>.md`.
5. Wire up routes in `app/(app)/<name>/`.

## Removing a feature
1. Delete `features/<name>/`.
2. Delete its route under `app/(app)/<name>/`.
3. Remove its schema import from `convex/schema.ts`.
4. Run a Convex migration to drop the now-unused tables (recommended).
5. Update `docs/features/<name>.md` status to `removed`, or delete the stub.

## Convex schema strategy
- Each feature owns its tables, prefixed by feature name (`calendar_events`, `postgen_jobs`).
- Root `convex/schema.ts` composes them:
  ```ts
  import { calendarSchema } from "@/features/calendar/schema"
  import { postGenSchema } from "@/features/post-generator/schema"
  import { sharedSchema } from "@/convex/shared/schema"

  export default defineSchema({
    ...sharedSchema,
    ...calendarSchema,
    ...postGenSchema,
    // ...other features
  })
  ```
- Cross-feature queries (auth, users) live in `convex/shared/`, never inside a feature folder.

## Agent runtime
Per-agent folder under `agents/<name>/`:
```
agents/<name>/
├── skills.md         # contract: purpose, can / cannot do, inputs, outputs
├── system-prompt.md  # prompt sent to LLM
├── config.ts         # model, temperature, max tokens, OmniBits cap
├── tools/            # functions the agent can call
└── index.ts          # invoke(input) → output OR stream
```

**Single shared invocation flow** (background and chat agents both use it):
```
agent.invoke(input, { stream?: boolean })
  → load skills.md + system-prompt.md
  → call lib/openrouter (with OmniBits metering wrapper)
  → return result (background) OR stream tokens (chat)
```

**Triggers:**
- **Inline** — server actions / Convex actions, fired when a user does something.
- **Scheduled** — Convex scheduled functions, cron-like.
- No external queue / worker (BullMQ etc.) for v1. Add later only if Convex limits hit.

**`skills.md` is the contract.** Write it first when adding a new agent — it doubles as the spec and the prompt-context document the agent reads at runtime.

## Video pipeline
**Render runs only on Coolify; storage lives on Cloudflare R2.** No ffmpeg or Remotion CLI installed on dev laptops — devs trigger renders against Coolify just like prod does. The render worker writes finished assets directly to R2, never to local disk.

Flow:
```
1. User browses media library (premade videos served from R2 via Cloudflare CDN)
2. User selects video(s) + prompts AI
3. App writes a render job to Convex
4. Render worker (Node service on Coolify) subscribes to Convex jobs:
   a. Script generation       → OpenRouter (LLM)
   b. Narration audio         → OpenRouter (Gemini 3.1 TTS)
   c. Composition             → Remotion
   d. Encoding                → ffmpeg
   e. Upload result           → Cloudflare R2 (S3 PUT)
5. Worker updates job status + R2 object key in Convex
6. App subscribes to job, shows progress, plays final video from the R2 public URL
```

**Job state machine:**
`queued → generating_script → generating_audio → rendering → encoding → complete | failed`

**Single Coolify environment for v1.** Use a `dev_` prefix on jobs to separate dev from prod renders. Split into separate Coolify instances later when load justifies it. Same goes for R2 buckets — `omnigrowth-media-dev` and `omnigrowth-media-prod`.

## OmniBits economy (deferred — placeholder)
**Status:** deferred. Decisions need real OpenRouter cost data + a clearer integration list.

**What's locked:** OmniBits is the user-facing currency. All OpenRouter calls (LLM, TTS) and rendering jobs flow through a metering wrapper that converts raw cost → OmniBits at a published exchange rate. Subscription tiers grant a monthly OmniBits balance. When the balance hits zero, generation pauses; the user can top up or wait for the next cycle.

**Open questions:**
- Conversion rate (1 OmniBit = $X of OpenRouter cost? Or per-1k tokens?).
- Whether video rendering also costs OmniBits (Coolify CPU time) or only the LLM / TTS portion.
- Rollover policy — do unused OmniBits expire each month?
- Top-up pricing.

Captured in `features/omnibits-economy.md`.

## Subscription tiers (deferred — placeholder)
**Status:** deferred. 3 tiers planned. OmniBits per tier and pricing TBD after the OmniBits economy is finalized.

Captured in `features/settings-billing.md`.

## Storage layer
Two storage backends, split strictly by what they hold:

- **Convex** — application data only (drafts, schedules, jobs, sessions, analytics records, brand-voice metadata, OmniBits ledger). Cheap and fast for structured rows; **never used for binary blobs**.
- **Cloudflare R2** — every binary asset (premade clips, AI-rendered video output, AI-generated images, user uploads). S3-compatible, served via short-lived signed URLs minted by Convex actions. The bucket has no public access; every browser read goes through a 24h signed GET URL. See `docs/superpowers/plans/2026-05-05-r2-media-library-foundation.md`.

Convex stores only **the object key + metadata** (mime, size, owner, tags); the bytes live in R2.

### Why R2 (decision recorded 2026-05-03)
The original plan stored renders and the premade catalog on the Coolify VPS disk. We pivoted before the video pipeline shipped. Reasons, in order:

1. **Free egress.** R2 charges $0 for bandwidth out at every tier. Video and image files are bandwidth-heavy and our viewer count scales unpredictably; metered egress (Convex $0.12/GB, AWS S3 ~$0.09/GB, even Hetzner cloud server allowance) creates a cost cliff that R2 doesn't have.
2. **Global CDN included.** Cloudflare's edge network fronts every R2 object out of the box. Coolify storage is a single Hetzner DC with no CDN; we'd have to put one in front, paying for it separately.
3. **Disk pressure on the Coolify host.** The current Hetzner box has 80 GB of local disk shared with the OS, Coolify itself, the render worker scratch space, and previously the asset catalog. Renders fill that fast. Pulling assets off the local disk frees it for actual scratch space.
4. **Free tier covers v1.** 10 GB storage + 10 M reads + 1 M writes per month, **forever, no time-limited trial.** v1 dev and beta will not exceed this. Above the free tier it's $0.015/GB-month with free egress — still essentially nothing at our scale.
5. **S3-compatible API.** Remotion writers, ffmpeg uploaders, Convex actions, and `<video src>` players all just work. Switching costs are low; lock-in is low (any S3 client points anywhere).

### What R2 does *not* replace
- **Convex file storage** is still allowed for tiny per-row attachments where the convenience of staying inside Convex actions outweighs the egress cost (e.g., < 10 KB metadata blobs). For anything user-visible or media-shaped, default to R2.
- **Coolify** stays — but its job is exclusively running the render worker (CPU + ffmpeg + Remotion). Coolify no longer holds the asset catalog or the render outputs.

## Cross-platform development (Mac / Windows)
- **Render-only-on-Coolify** — no ffmpeg or Remotion CLI installed locally. Devs trigger renders on Coolify; the worker writes to R2.
- **Line endings** — `.gitattributes` enforces `* text=auto eol=lf`. `.editorconfig` mirrors.
- **Scripts** — all live in `package.json` as pnpm scripts. No `.sh` files. No bash-only commands.
- **Paths** — always `path.join(...)`. Never hardcode `/` or `\` in code.
- **Tooling** — pnpm, Biome, Convex CLI, Vitest, Playwright, Remotion preview all run native on both platforms. No Docker or WSL required.

## External services
| Service        | Purpose                                    | Account needed   |
|----------------|--------------------------------------------|------------------|
| Vercel         | App hosting                                | yes              |
| Convex         | DB + auth + scheduled functions            | yes              |
| OpenRouter     | LLM + TTS gateway                          | yes              |
| Cloudflare R2  | Media / blob storage (S3-compatible + CDN) | yes (free tier)  |
| Coolify        | Render worker (CPU only, no asset storage) | yes (user-owned) |
| postforme.dev  | Social posting                             | yes              |
| Resend         | Email                                      | yes              |
| PostHog        | Product analytics                          | yes (free tier)  |
| Context7       | Always-on docs reference                   | yes              |

## See also
- `product-overview.md` — what this product is and who it's for
- `features/` — per-feature deep specs
