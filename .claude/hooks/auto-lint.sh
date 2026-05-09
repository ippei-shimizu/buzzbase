#!/bin/bash

# PostToolUse hook: Edit/Write 後に変更ファイルのリンター・フォーマッターを自動実行

set -e

INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE" ] || [ "$FILE" = "null" ]; then
  exit 0
fi

if [ ! -f "$FILE" ]; then
  exit 0
fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-/Users/shimizuippei/projects/dev/buzzbase}"

# front/
if [[ "$FILE" == *"/front/"* ]]; then
  cd "$PROJECT_DIR/front"
  npx prettier --write "$FILE" 2>/dev/null || true
  npx eslint --fix "$FILE" 2>/dev/null || true
  npx tsc --noEmit 2>/dev/null || true
  exit 0
fi

# back/ (.rb のみ)
if [[ "$FILE" == *"/back/"* && "$FILE" == *.rb ]]; then
  RELATIVE="${FILE#*back/}"
  cd "$PROJECT_DIR"
  docker compose exec -T back bundle exec rubocop -a "$RELATIVE" 2>/dev/null || true
  exit 0
fi

# mobile/
if [[ "$FILE" == *"/mobile/"* ]]; then
  cd "$PROJECT_DIR/mobile"
  npx prettier --write "$FILE" 2>/dev/null || true
  npx eslint --fix "$FILE" 2>/dev/null || true
  npx tsc --noEmit 2>/dev/null || true
  exit 0
fi

exit 0
