#!/usr/bin/env bash
# SessionStart hook.
# Injects a short summary of the repo state into Claude's context at session start.
# Output to stdout becomes part of the session's initial context.
# Fail-open: any error exits 0 silently.

set -u

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$PROJECT_DIR" 2>/dev/null || exit 0

# Only run git commands if this is a git repo.
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '(unknown)')"
head="$(git log -1 --pretty=format:'%h %s' 2>/dev/null || echo '(no commits)')"
dirty_count="$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
untracked="$(git ls-files --others --exclude-standard 2>/dev/null | wc -l | tr -d ' ')"
version="$(grep -oE '"version"[[:space:]]*:[[:space:]]*"[^"]*"' package.json 2>/dev/null | head -n1 | sed -E 's/.*"version"[[:space:]]*:[[:space:]]*"([^"]*)".*/\1/')"

cat <<EOF
[pxdk:session-start]
PixelCreator v${version:-?} — branch: ${branch}
HEAD: ${head}
Working tree: ${dirty_count} modified, ${untracked} untracked
Devkit plugin: pixelcreator-devkit v0.1.0 active
Tip: type /pxdk: to see plugin skills (plan, tdd, verify, engine-new, pixel-scene…)
EOF

exit 0
