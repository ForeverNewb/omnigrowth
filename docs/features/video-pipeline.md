# Video Pipeline

**Status:** stub
**Type:** foundational system

## Purpose
Generate finished social-ready videos from premade clips + AI script + AI narration. Render runs entirely on Coolify (CPU). All asset bytes — inputs and outputs — live on Cloudflare R2. The app coordinates jobs via Convex.

## In scope
- Premade video catalog (stored in R2, served via Cloudflare CDN)
- Render job queue (Convex)
- Render worker (Node service on Coolify)
- Script generation (OpenRouter LLM)
- Narration generation (OpenRouter Gemini 3.1 TTS)
- Composition (Remotion)
- Encoding (ffmpeg)
- Result upload to Cloudflare R2 (S3 PUT)
- Job status tracking + progress in app
- Single Coolify environment + single R2 bucket for v1, with `dev_` prefix on dev jobs and a separate `omnigrowth-media-dev` bucket

## Out of scope (v1)
- Manual timeline editing
- Custom transitions / effects
- Background music selection
- Subtitles / captions (could be added later via TTS-to-text)

## Depends on
- `agent-runtime` (script + narration agents)
- `media-library` (premade clips + result storage records)
- `omnibits-economy` (metering)
- Coolify (render worker host — CPU only)
- Cloudflare R2 (input clip catalog + render outputs; see `../architecture.md` § Storage layer for rationale)

## Used by
- `post-generator` (when video output is requested)

## Job state machine
`queued → generating_script → generating_audio → rendering → encoding → complete | failed`

## Open questions
- Concurrent render limits per Coolify instance.
- Does render time cost OmniBits, or is it bundled into LLM / TTS cost?
- Job retention — delete result video after N days? (cheap on R2 thanks to free egress, but still worth a TTL policy)
- When do we split Coolify into separate dev / prod instances? (R2 we can split immediately — buckets are free)
- Public-URL strategy: stick with the default `*.r2.dev` URL for v1, or bind a custom domain (`media.omnigrowth.app`) from day one?

## See also
- `../architecture.md`
- `post-generator.md`
- `media-library.md`
