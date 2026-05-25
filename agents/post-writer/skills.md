# post-writer

## Purpose
Generate a social-media post draft from a brief, scoped to one channel and one tone.

## Inputs
- `brand`: `{ name, voice, description }` from `brand_profiles`
- `brief`: free-text user request (1 to 3 sentences)
- `channel`: one of `x`, `li`, `ig`, `fb`, `tt`, `yt`, `th`, `pi`
- `tone`: `"warm" | "dry" | "bold"`

## Outputs
- `{ text: string }`: ready-to-paste post content

## Boundaries
- Single channel per call; multi-channel orchestration belongs higher in the stack.
- Plain text only for this slice; image/video are separate agents.
- Refusals from upstream models surface as `AgentError { code: "GEN_REFUSED" }`.
