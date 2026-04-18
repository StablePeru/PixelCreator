#!/usr/bin/env bash
# PostToolUse hook for Edit|Write|MultiEdit.
# If the edited file is a TS/TSX in packages/**, run the owning package's lint --fix on it.
# Fail-open: any error is silent and exits 0 so the main loop is never blocked.

set -u

input="$(cat 2>/dev/null || true)"
[ -z "$input" ] && exit 0

# Extract file_path from tool input (tolerant parse).
file="$(printf '%s' "$input" | tr -d '\n' | grep -oE '"file_path"\s*:\s*"[^"]*"' | head -n1 | sed -E 's/.*"file_path"\s*:\s*"([^"]*)".*/\1/')"

[ -z "$file" ] && exit 0

# Only lint TS/TSX in one of the workspace packages.
case "$file" in
  *packages/core/*|*packages/cli/*|*packages/studio/*) ;;
  *) exit 0 ;;
esac

case "$file" in
  *.ts|*.tsx) ;;
  *) exit 0 ;;
esac

# Skip test files — they often have intentional patterns lint might reformat.
case "$file" in
  */test/*|*.test.ts|*.test.tsx|*.spec.ts|*.spec.tsx) exit 0 ;;
esac

# Pick the filter.
pkg=""
case "$file" in
  *packages/core/*)   pkg="@pixelcreator/core" ;;
  *packages/cli/*)    pkg="@pixelcreator/cli" ;;
  *packages/studio/*) pkg="@pixelcreator/studio" ;;
esac

[ -z "$pkg" ] && exit 0

# Run lint --fix on the single file. Silence stdout; only surface errors on stderr.
# Timeout is enforced by the hook config (30s).
(cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || cd "$(pwd)") && \
  pnpm --filter "$pkg" lint --fix "$file" >/dev/null 2>&1 || true

exit 0
