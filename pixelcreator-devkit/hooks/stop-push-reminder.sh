#!/usr/bin/env bash
# Stop hook: if the working tree is clean but local main is ahead of origin/main,
# remind the user to push. Fail-open.

set -u

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$PROJECT_DIR" 2>/dev/null || exit 0

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

dirty="$(git status --porcelain 2>/dev/null)"
[ -n "$dirty" ] && exit 0

branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
[ "$branch" != "main" ] && exit 0

git rev-parse --verify --quiet origin/main >/dev/null 2>&1 || exit 0

ahead="$(git rev-list --count origin/main..HEAD 2>/dev/null)"
[ -z "$ahead" ] && exit 0
[ "$ahead" = "0" ] && exit 0

cat <<EOF
[pxdk:stop] main está ${ahead} commit(s) por delante de origin/main.
Para cerrar el ciclo: /pxdk:close-task   (o git push origin main si ya está todo listo)
EOF

exit 0
