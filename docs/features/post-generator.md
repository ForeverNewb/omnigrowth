# Post Generator

**Status:** stub
**Type:** user-facing feature

## Purpose
Generate social media posts (text, image, or video) with AI assistance that respects the **active brand profile's** voice and guardrails. Output flows into that brand's calendar or posts directly via that brand's connected accounts.

## Scope boundary
Always operates on the **active brand profile**. Generations, drafts, and jobs are owned by a brand, not a user. OmniBits consumed are billed to the user's wallet but attributed to the brand for analytics.

## In scope
- Text post generation (LLM)
- Image generation (image-capable model via OpenRouter)
- Video generation (handoff to `video-pipeline`)
- Brand voice integration (reads from `brand-profile`)
- Output → save to drafts, schedule, or post immediately
- Per-channel preview (X, IG, LinkedIn, etc.)

## Out of scope (v1)
- Manual editing of AI-generated video timelines
- A/B variant generation
- Multi-language post generation
- Templates marketplace
- **User-selectable LLM** — see "Model selection" below

## Model selection
**Users do not pick the LLM.** They pick **media type** only:

| User picks | Backend chooses                                    | Provider          |
|------------|----------------------------------------------------|-------------------|
| Text       | Claude Sonnet 4.5 / GPT-5 / Gemini 2.5 Pro         | OpenRouter        |
| Image      | Gemini 3.1 Flash Image / Imagen 4 Fast / GPT-1.5   | Together / Wavespeed |
| Video      | Kling 2.1 Pro / Wan 2.2 / Veo 3                    | Together / Wavespeed |

**Why:** Marketers don't want to think about which LLM is best — that's decision fatigue. The product promise is "brief once, AI handles it". Surfacing model names breaks that.

**How this affects the UI:**
- No model badges on draft cards (no "Claude" / "GPT" / "Gemini" chips).
- No model copy in marketing or in-app text ("multi-model" is OK; specific names are not).
- The dedicated generator page may show a single neutral indicator (e.g. ✦ AI) but never the model name.

**Backend is unconstrained.** `lib/openrouter`, `lib/together`, and `lib/wavespeed` freely use model IDs — selection logic (cost, capability, fallback) lives entirely in the post-writer agent's `config.ts`. The agent picks per-call based on the brief, media type, channel constraints, and OmniBits cost.

## Provider routing (verified 2026-05-09)

Image and video models live on two providers because **price wins are split**: Together AI is cheaper on most premium models (Kling family, Vidu, Nano Banana 2), Wavespeed wins on a specific subset (Wan 2.2, Veo 3, Imagen 4 Fast). We use both and route per-model. Some prices need to be **tested in production** before locking in the routing — agents reported price discrepancies on Together (e.g. Vidu 2.0 pricing-page vs catalog conflict).

### Verified per-model prices (1024² image · 5s 720p video)

| Model | Together AI | Wavespeed | fal.ai | Route to |
|---|---|---|---|---|
| Gemini 3.1 Flash Image (Nano Banana 2) | **$0.05** | $0.07 | NOT LISTED | Together |
| Imagen 4.0 Fast | $0.02/MP | **$0.018** | $0.02 | Wavespeed |
| GPT Image 1.5 | **$0.034** | $0.034 (med) | NOT LISTED | Together |
| Qwen3.6-Plus (video) | **$0.50** | LLM only (not video) | NOT LISTED | Together |
| Google Veo 3.0 | $1.60 | **$1.20** (no-audio) | $2.50 | Wavespeed |
| Kling 1.6 Pro | **$0.32** | $0.45 | $0.49 | Together |
| Kling 1.6 Standard | **$0.19** | $0.25 | $0.28 | Together |
| Kling 2.0 Master | **$0.92** | $1.30 | $1.40 | Together |
| Kling 2.1 Master | **$0.92** | $1.30 | $1.40 | Together |
| Kling 2.1 Pro | **$0.32** | $0.45 | $0.49 | Together |
| Kling 2.1 Standard | **$0.18** | $0.25 | $0.28 | Together |
| Vidu 2.0 | **$0.28** (verify) | $0.30 | NOT LISTED | Together |
| Vidu Q1 | **$0.22** | $0.40 | $0.40 | Together |
| Wan 2.2 I2V | $0.31 | **$0.30** | $0.40 | Wavespeed |
| Wan 2.2 T2V | $0.66 | **$0.30** | $0.40 | Wavespeed |

### Routing summary
- **Together AI = primary** — 10 of 15 models cheapest there, single biggest vendor by usage.
- **Wavespeed = specialist routes** — Veo 3.0, Wan 2.2 (both variants), Imagen 4 Fast.
- **fal.ai dropped** — catalog gaps (missing 4 requested models) + uncompetitive on price.

### Open caveats (test before locking in)
- **Vidu 2.0** Together pricing-page says $0.28; their docs catalog says $0.80 for the same model. Confirm in console before defaulting routing here.
- **Qwen3.6-Plus** is a *video* model on Together at $0.50/clip but a *text LLM* on Wavespeed. Different product, same name. We use Together's video variant.
- **Veo 3.0** Wavespeed is $1.20 *no-audio* / $3.20 *with-audio*. Decide which one we expose by default — most social posts use platform-track audio so no-audio is fine.

## Observability + evals
Every model call goes through **Langfuse** (cloud free tier 50k obs/mo, self-host when we outgrow it). Each agent run also writes a summary record to Convex `agent_runs` for in-app filtering (e.g. "show me my last 10 drafts and what they cost"). Evals live in Convex `agent_evals` — small seed dataset (≥10 briefs × 3 channels) scored by an LLM-as-judge. See `agent-runtime.md` for the shared infra.

## Depends on
- `agent-runtime` (post-writer agent does the work)
- `brand-profile` (style / voice inputs)
- `video-pipeline` (when video output is selected)
- `omnibits-economy` (cost metering)
- `media-library` (image / video output saved here)

## Used by
- `dashboard` (quick generator widget)
- `calendar` (when user creates a new post in a slot)

## Open questions
- Streaming preview vs fully-rendered preview?
- Veo 3.0 audio-on or audio-off as default? (current lean: audio-off — social platforms supply track audio)
- Verify Vidu 2.0 actual price on Together (pricing-page vs docs catalog conflict)

## See also
- `../architecture.md`
- `agent-runtime.md`
- `video-pipeline.md`
- `brand-profile.md`
