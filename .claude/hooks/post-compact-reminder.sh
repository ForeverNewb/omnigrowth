#!/bin/bash
# SessionStart (compact) hook: Re-inject critical reminders after context compaction

cat << 'EOF'
CRITICAL REMINDERS (post-compaction):
1. CONTEXT7: Call context7 before editing any code that uses libraries/APIs/frameworks
2. CONVEX SCHEMA: Read convex/schema.ts and feature schemas before mutations
3. CLAUDE DESIGN: When asked to implement a design, fetch from api.anthropic.com/v1/design/h/<id>, read the README and chat transcripts first
4. BUG FIX PROTOCOL: Output ROOT CAUSE / DUPLICATES FOUND / FIX APPROACH before writing fix code
5. FILE SIZE: Target ~200 lines, hard limit ~300 lines per file
6. CHANGELOG: Run changelog-update skill before pushing to GitHub
EOF
