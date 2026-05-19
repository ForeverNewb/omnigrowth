#!/bin/bash
# SessionStart hook: Check how far the current branch has diverged from main

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}"
cd "$PROJECT_DIR" 2>/dev/null || exit 0

CURRENT_BRANCH=$(git branch --show-current 2>/dev/null)
if [ -z "$CURRENT_BRANCH" ] || [ "$CURRENT_BRANCH" = "main" ]; then
  exit 0
fi

# Fetch latest main silently
git fetch origin main --quiet 2>/dev/null

BEHIND=$(git rev-list --count HEAD..origin/main 2>/dev/null)
AHEAD=$(git rev-list --count origin/main..HEAD 2>/dev/null)

if [ "$BEHIND" -gt 0 ]; then
  echo "Branch '$CURRENT_BRANCH' is $BEHIND commits behind main and $AHEAD commits ahead."
  echo "Consider rebasing before starting work: git rebase origin/main"
else
  echo "Branch '$CURRENT_BRANCH' is up to date with main ($AHEAD commits ahead)."
fi
