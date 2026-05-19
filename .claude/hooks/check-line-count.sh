#!/bin/bash
# PostToolUse hook: Check if edited file exceeds line count limits
# Target: ~200 lines, hard limit: ~300 lines

FILE_PATH=$(echo "$TOOL_INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('file_path',''))" 2>/dev/null)

if [ -z "$FILE_PATH" ] || [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

# Skip non-code files
case "$FILE_PATH" in
  *.md|*.json|*.sql|*.css|*.txt|*.yaml|*.yml|*.env*|*.csv)
    exit 0
    ;;
esac

LINE_COUNT=$(wc -l < "$FILE_PATH" | tr -d ' ')

if [ "$LINE_COUNT" -gt 300 ]; then
  echo "HARD LIMIT EXCEEDED: $FILE_PATH is $LINE_COUNT lines (limit: ~300). Extract sub-components, hooks, or utils immediately."
  exit 1
elif [ "$LINE_COUNT" -gt 200 ]; then
  echo "WARNING: $FILE_PATH is $LINE_COUNT lines (target: ~200). Consider extracting sub-components, hooks, or utils."
  exit 0
fi

exit 0
