# Connected Accounts

**Status:** stub
**Type:** user-facing feature

## Purpose
Let users connect social media accounts (X, IG, LinkedIn, TikTok, FB) **per brand profile** so OmniGrowth can publish posts and read analytics on each brand's behalf via postforme.dev.

## Scope boundary
Connected accounts belong to a **brand profile**, not directly to a user. A user with multiple brands connects each platform separately per brand (e.g., Brand A has its own LinkedIn; Brand B has a different LinkedIn). This keeps publishing and analytics cleanly isolated.

## In scope
- OAuth flow per platform (mediated by postforme.dev)
- List of connected accounts with status (connected / token expired / disconnected)
- Disconnect a platform
- Per-platform settings (default channels, etc.)

## Out of scope (v1)
- Direct platform integrations (postforme.dev handles this for v1)
- Multi-account per platform (e.g., two LinkedIn pages)

## Depends on
- postforme.dev (OAuth + posting)
- `auth` (user identity)
- `brand-profile` (accounts are scoped to a brand)

## Used by
- `calendar` (publishing)
- `analytics` (reading metrics)
- `post-generator` (per-platform preview)

## Open questions
- Which platforms in v1 — probably X + LinkedIn + IG, defer TikTok / FB?
- How do we handle token refresh failures — passive notification, or block scheduling?

## See also
- `../architecture.md`
- `calendar.md`
- `analytics.md`
