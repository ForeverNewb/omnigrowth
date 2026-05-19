# Settings & Billing

**Status:** stub
**Type:** user-facing feature

## Purpose
Account settings, subscription tier management, OmniBits balance & top-up, and billing history.

## In scope
- Profile info (name, email, password change)
- Current tier + OmniBits balance
- Upgrade / downgrade tier
- Top-up OmniBits
- Billing history (invoices)
- Cancel subscription

## Tier dimensions (TBD numbers)
Each tier gates several quotas. Confirmed dimensions:
- **Brand profiles** — how many distinct brands a user can run (see `brand-profile.md`). Indicative: Free 1 / Pro 3 / Agency 10+.
- **Monthly OmniBits balance** — gates AI generation volume.
- **Connected accounts per brand** — TBD whether this is also tier-gated or unlimited.

OmniBits and billing are **user-level** (one wallet funds all brands). Brand-profile quota is the only per-brand-count gate.

## Out of scope (v1)
- Team billing
- Usage-based pricing beyond OmniBits
- Invoice customization (purchase orders, etc.)

## Depends on
- `auth`
- `omnibits-economy`
- Payment processor (TBD — Stripe likely)

## Used by
- All authenticated users

## Open questions
- Payment processor (Stripe? Paddle?).
- Tier definitions: 3 tiers, OmniBits per tier, brand-profile cap per tier, pricing — TBD.
- How does top-up pricing relate to subscription pricing?
- Is connected-accounts-per-brand also tier-gated, or only brand-profile count?

## See also
- `../architecture.md`
- `omnibits-economy.md`
