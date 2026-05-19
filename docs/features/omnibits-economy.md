# OmniBits Economy

**Status:** deferred
**Type:** foundational system

## Purpose
Internal currency that abstracts raw OpenRouter (LLM / TTS) cost and Coolify rendering cost into a single user-facing token. Subscription tiers grant a monthly balance; top-ups available.

## What's locked
- OmniBits is the user-facing currency.
- All OpenRouter calls flow through a metering wrapper around `lib/openrouter`.
- Render jobs that consume Coolify CPU may also be priced in OmniBits (TBD).
- Subscription tiers grant a monthly balance.
- Generation pauses when balance ≤ 0; user tops up or waits for the next cycle.

## In scope
- Conversion of OpenRouter cost → OmniBits at a published rate
- Conversion of Coolify render time → OmniBits (TBD)
- Per-call metering wrapper around `lib/openrouter`
- Balance enforcement: refuse generation when balance ≤ 0
- Balance tracking + transaction history per user
- Monthly grant via subscription tier
- Manual top-up purchase

## Out of scope (v1)
- Refunds for failed generations
- Earning OmniBits via referrals / etc.
- Sharing OmniBits between users

## Depends on
- `auth` (user-scoped balances)
- `lib/openrouter` (every call goes through metering wrapper)
- `settings-billing` (tier grants the monthly balance)

## Used by
- Every feature that calls an LLM / TTS or triggers a render

## Open questions (the deferred decisions)
- Conversion rate (1 OmniBit = $X? Or per-1k tokens?)
- Does video rendering cost OmniBits (Coolify CPU time), or only the LLM / TTS portion?
- Rollover policy — do unused OmniBits expire each month, or carry over?
- Top-up pricing structure
- Soft vs hard cap (warn at 10% remaining? Block at 0?)

**Why deferred:** Need real OpenRouter cost data once we're generating volume + a clearer picture of which integrations exist before locking the rate.

## See also
- `../architecture.md`
- `settings-billing.md`
- `agent-runtime.md`
