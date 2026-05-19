# Analytics

**Status:** building
**Type:** user-facing feature

## Purpose
Show the user how the **active brand's** content is performing across that brand's connected channels and how much OmniBits each post is consuming.

## Scope boundary
Scoped to the **active brand profile**. Each brand has its own analytics; switching brands switches the dataset. OmniBits cost rollup per brand is shown here, even though the underlying wallet is user-level.

## In scope
- Per-post performance (impressions, engagement, clicks where available)
- Per-channel summary
- OmniBits consumed over time
- Top-performing posts
- Date range filtering

## Out of scope (v1)
- Predictive analytics
- Cross-channel attribution modeling
- Custom event tracking
- Exporting reports (CSV / PDF)

## Depends on
- `brand-profile` (active brand defines scope)
- `connected-accounts` (data source, scoped to brand)
- `calendar` (post metadata)
- `omnibits-economy` (cost data, attributed per brand)

## Used by
- All authenticated users

## Open questions
- How frequently do we sync from each social platform?
- Which platforms expose what metrics in postforme.dev's API?

## See also
- `../architecture.md`
- `connected-accounts.md`
