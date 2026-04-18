#!/usr/bin/env bash
# Stop hook.
# If the working tree has changes when Claude stops, remind the user to run /pxdk:verify.
# Output goes to stdout as a final message. Fail-open.

set -u

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$PROJECT_DIR" 2>/dev/null || exit 0

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

dirty="$(git status --porcelain 2>/dev/null)"
[ -z "$dirty" ] && exit 0

count="$(printf '%s' "$dirty" | wc -l | tr -d ' ')"

cat <<EOF
[pxdk:stop] Working tree has ${count} change(s) uncommitted.
Before committing, run: /pxdk:verify   (build + types + lint + tests)
EOF

exit 0
