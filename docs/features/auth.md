# Auth

**Status:** building (Convex Auth wired with Password provider; OAuth + magic links to follow)
**Type:** foundational system + user-facing feature

## Purpose
Authenticate users so they can access the dashboard, manage their data, and have personal settings / billing.

## In scope
- Email + password sign-up & sign-in
- Session management
- Logout
- Protected routes (everything under `app/(app)/`)
- First-run onboarding: a fresh user is required to name and create their first brand profile before reaching the dashboard (see `brand-profile.md`)

## Out of scope (initially)
- Social login (Google / X / etc.)
- Magic link
- 2FA / MFA
- SSO

## Depends on
- Convex Auth
- Email (Resend) — for password reset, future magic link
- `settings-billing` (assigns the free tier on signup)
- `brand-profile` (the onboarding flow creates the user's first brand)

## Used by
- All app routes (gated)
- All features (any user-scoped data)

## Open questions
- Do we add Google sign-in in v1, or defer?
- Email verification required pre-dashboard, or allow access first?

## See also
- `../architecture.md`
- `settings-billing.md`
