# Brand Profile

**Status:** building
**Type:** foundational system + user-facing feature

## Purpose
Capture each brand's voice, audience, visual identity, connected channels, and content guardrails — so every AI-generated output reads on-brand without re-prompting, and so all user-facing data (posts, calendar, analytics, connected accounts) is cleanly isolated per brand.

## Multi-brand model
A single user can own **multiple brand profiles** (e.g. a freelancer managing several clients, or a creator running parallel personal + business brands). The brand profile is the **workspace / isolation boundary** for everything user-facing:

```
user (1) ─< brand_profile (N) ─< connected_account (N)
                              ─< post / draft / generation job (N)
                              ─< calendar_event (N)
                              ─< analytics_record (N)
```

What stays at the **user** level (shared across brands):
- Auth identity, login, password
- Subscription tier
- OmniBits wallet (one balance funds all brands)
- Billing history

What lives at the **brand profile** level (isolated per brand):
- Brand voice / tone / audience / guardrails
- Visual identity (logo, colors)
- Connected social accounts
- Posts, drafts, scheduled content, calendar entries
- Analytics records

The active brand is carried in the URL (`/b/[brandId]/...`) so every protected route is naturally brand-scoped and links are shareable.

## Tier-gated quota
The number of brand profiles a user can create is capped by their subscription tier. Indicative (final numbers TBD with `settings-billing`):

| Tier      | Brand profiles |
|-----------|----------------|
| Free      | 1              |
| Pro       | 3              |
| Agency    | 10+            |

Quota is enforced on creation. Downgrading below current usage does not delete brands; the user keeps read-only access until they remove brands or upgrade.

## In scope
- Create / rename / delete a brand profile
- Brand name, description, tagline
- Voice & tone (e.g., playful, authoritative, technical)
- Audience description
- Do's and don'ts (forbidden words, required disclaimers)
- Visual identity (primary / secondary colors, logo upload)
- Per-channel tone overrides (e.g., LinkedIn formal, TikTok casual)
- Brand switcher in app chrome
- Tier-gated quota enforcement
- First-brand creation as part of onboarding (see `auth.md`)

## Out of scope (v1)
- Sharing a brand profile with another user (multi-user workspaces — see architecture non-goals)
- Auto-extraction of brand from existing posts (could be added later)
- Cross-brand bulk operations (e.g. "post this to all my brands at once")

## Depends on
- `auth` (user-scoped ownership)
- `settings-billing` (tier → quota)
- `media-library` (logo storage on R2)

## Used by
- `post-generator` (every AI generation reads voice / tone for the active brand)
- `agent-runtime` (agents inject brand context into system prompts)
- `video-pipeline` (visual identity for overlays)
- `connected-accounts` (accounts belong to a brand, not the user)
- `calendar`, `analytics`, `dashboard` (all views filter by active brand)

## Open questions
- Do we offer a "brand wizard" (5 questions → profile) or pure form?
- How structured should voice / tone be — free text, sliders, or chosen tags?
- On downgrade-below-quota, do we lock the oldest or newest brands as read-only?

## See also
- `../architecture.md`
- `auth.md`
- `settings-billing.md`
- `post-generator.md`
- `agent-runtime.md`
