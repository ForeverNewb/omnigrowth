# Notifications

**Status:** stub
**Type:** foundational system

## Purpose
Tell users when something they care about happens: a post published, a render finished, OmniBits low, a connected account expired.

## In scope
- In-app notifications (bell icon, list view, mark-read)
- Email notifications via Resend (selected events only)
- Per-event preferences (turn on / off)
- Default rules (post failed → always email; render done → in-app only)

## Out of scope (v1)
- Push notifications (browser / mobile)
- SMS
- Outbound webhooks

## Depends on
- Resend (email)
- `auth` (user-scoped)
- Every feature that emits events (`calendar`, `post-generator`, `video-pipeline`, `omnibits-economy`, `connected-accounts`)

## Used by
- All authenticated users

## Open questions
- Default email frequency policy — immediate vs daily digest?
- Global "snooze all" option?

## See also
- `../architecture.md`
