# Media Library

**Status:** v1 shipped — foundation
**Type:** user-facing feature + foundational system

## Purpose
Centralize all media assets the user can include in posts: uploaded images / clips, premade videos, and AI-generated outputs. Every binary lives on Cloudflare R2; Convex stores only the metadata row pointing at the R2 object.

## In scope
- Upload images / videos from device (browser → signed PUT → R2)
- Browse premade video library (R2-hosted catalog, fetched via short-lived signed URLs)
- View AI-generated media outputs (saved automatically by `post-generator` and `video-pipeline`, written directly to R2 by their workers)
- Tag / filter (kind, source, date) — metadata in Convex, bytes in R2
- Use in posts (selectable from the calendar / generator)

## Out of scope (v1)
- Folders / collections
- Sharing media between users
- Inline image editing (crop / filter) — handled in `post-generator` if needed

## Depends on
- **Cloudflare R2** — all binary blobs (uploads, premade clips, render outputs, AI-generated images). See `../architecture.md` § Storage layer.
- **Convex** — metadata records only (object key, mime, size, owner, tags). No bytes stored in Convex for this feature.
- `auth` (user-scoped)

## Used by
- `post-generator`
- `calendar`
- `video-pipeline` (premade clips as inputs, results as outputs)

## Open questions
- Storage limit per tier? (R2 charges $0.015/GB-month above the 10 GB free allowance — generous limits feasible)
- Premade video catalog — curated only, or expandable by user uploads?

## See also
- `../architecture.md`
- `video-pipeline.md`
- `post-generator.md`
