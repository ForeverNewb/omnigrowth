# Dashboard

**Status:** building
**Type:** user-facing feature

## Purpose
Default landing screen after login (and after picking a brand). Shows the **active brand's** today's calendar, recent posts, the user's OmniBits balance (shared across brands), and a "Quick AI Post Generator" front and center.

## Scope boundary
The dashboard is brand-scoped: today's posts, recent activity, and the quick generator all act on the **active brand profile**. The OmniBits balance widget is the one user-level element. A brand switcher in the app chrome lets the user change context without leaving the dashboard.

## In scope
- Quick AI post generator (compact prompt → preview → schedule / post)
- Today's scheduled posts (mini-calendar view)
- OmniBits balance + low-balance warning
- Quick links to other features

## Out of scope
- Full post generation flow (lives in the `post-generator` route)
- Full calendar (lives in the `calendar` route)
- Analytics (lives in the `analytics` route)

## Depends on
- `post-generator` (quick generator widget)
- `calendar` (today's posts widget)
- `omnibits-economy` (balance widget)

## Used by
- All authenticated users

## Open questions
- Should the dashboard be customizable (re-orderable widgets)?
- Default view per persona — manual-heavy vs AI-heavy users?

## See also
- `../architecture.md`
- `post-generator.md`
- `calendar.md`
