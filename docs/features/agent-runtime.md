# Agent Runtime

**Status:** stub
**Type:** foundational system

## Purpose
Folder-structured, OpenRouter-powered agents. Each agent is a self-contained folder with its skills, prompt, tools, and code. Background (server-triggered) and chat (user-facing) agents share the same runtime.

## In scope
- Per-agent folder convention (`skills.md`, `system-prompt.md`, `config.ts`, `tools/`, `index.ts`)
- Single shared invoke flow with a `stream?` flag
- OmniBits metering via `lib/openrouter` wrapper
- Background triggers: server actions + Convex scheduled functions
- Chat triggers: streaming endpoint, persisted history
- Agent registry / discovery

## Out of scope (v1)
- External job queue (BullMQ etc.) — Convex scheduled functions cover v1
- Multi-step agent workflows (simple call / response only in v1)
- Agent-to-agent calls

## Depends on
- OpenRouter
- `lib/omnibits` (metering)
- Convex (state, scheduled functions)
- `brand-profile` (agents inject brand context)

## Used by
- `post-generator` (post-writer agent)
- `video-pipeline` (script-writer agent, narration agent)
- Future research / automation features

## Open questions
- Standard tool calling format — JSON schema or custom?
- How are agent versions managed when prompts change?
- Default OmniBits cap per agent invocation (sanity limit)?

## See also
- `../architecture.md`
- `omnibits-economy.md`
