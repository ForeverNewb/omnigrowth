# Calendar

**Status:** building
**Type:** user-facing feature

## Purpose
Single calendar view for all scheduled and posted content across the **active brand's** connected social accounts. Users can create posts manually, paste pre-written posts, or schedule AI-generated posts.

## Scope boundary
Scoped to the **active brand profile**. Switching brands switches calendars — no cross-brand view in v1. Posts, drafts, and schedule entries are owned by a brand, not a user.

## In scope
- Month / week / day views
- Drag-to-reschedule
- Manual post creation in a slot
- Paste manual post (text / image / video)
- Schedule AI-generated post from `post-generator`
- Status: draft / scheduled / published / failed
- Per-channel filtering (X, IG, LinkedIn, TikTok, FB)

## Out of scope (v1)
- Approval workflow
- Multi-user collaboration
- Bulk-import from CSV / external tools

## Depends on
- `brand-profile` (active brand defines scope)
- `post-generator` (for AI-generated posts)
- `connected-accounts` (to know where to publish, scoped to brand)
- `media-library` (for attached media)

## Used by
- `dashboard` (today's posts widget)
- `analytics` (publish events)

## Open questions
- Time zone handling — user's TZ vs each account's audience TZ?
- How far in advance can a user schedule?

## See also
- `../architecture.md`
- `post-generator.md`
- `connected-accounts.md`
