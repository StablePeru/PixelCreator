#!/usr/bin/env bash
# PreToolUse hook for Bash.
# Blocks destructive commands unless the user has explicitly authorized them in this session.
# Exit codes:
#   0 → allow
#   2 → block (Claude will receive the stderr as the blocking reason)
# Fail-open: any unexpected error exits 0 to avoid breaking the workflow.

set -u

# Read the tool input JSON from stdin.
input="$(cat 2>/dev/null || true)"

# If we can't read input, allow (fail-open).
if [ -z "$input" ]; then
  exit 0
fi

# Extract the command string. We use a tolerant grep rather than jq so this works
# in bare Git Bash without extra deps.
cmd="$(printf '%s' "$input" | tr -d '\n' | grep -oE '"command"\s*:\s*"[^"]*"' | head -n1 | sed -E 's/.*"command"\s*:\s*"([^"]*)".*/\1/')"

if [ -z "$cmd" ]; then
  exit 0
fi

block() {
  echo "[pxdk:pre-bash-safety] BLOCKED: $1" >&2
  echo "If this is intended, run it yourself in the shell — Claude will not execute destructive commands automatically." >&2
  exit 2
}

# --- Rules ------------------------------------------------------------------

# rm -rf on root, home, or wildcards at dangerous locations
if echo "$cmd" | grep -Eq 'rm[[:space:]]+(-[A-Za-z]*r[A-Za-z]*f[A-Za-z]*|-[A-Za-z]*f[A-Za-z]*r[A-Za-z]*)[[:space:]]+(/|/\*|~|~/|/home|/root|C:/|C:\\\\)'; then
  block "rm -rf on root/home filesystem"
fi

# rm -rf node_modules, dist, .git, coverage without being prefixed by "pnpm" or "npx"
if echo "$cmd" | grep -Eq 'rm[[:space:]]+(-[A-Za-z]*r[A-Za-z]*f[A-Za-z]*|-[A-Za-z]*f[A-Za-z]*r[A-Za-z]*)[[:space:]]+\.git(/|[[:space:]]|$)'; then
  block "rm -rf on .git directory"
fi

# Force-push to main / master
if echo "$cmd" | grep -Eq 'git[[:space:]]+push[[:space:]]+(-[A-Za-z]*f[A-Za-z]*|--force(-with-lease)?)[[:space:]]+[^[:space:]]+[[:space:]]+(main|master)(\b|$)'; then
  block "git push --force on main/master"
fi

# git reset --hard without a specific ref (too broad for automation)
if echo "$cmd" | grep -Eq 'git[[:space:]]+reset[[:space:]]+--hard[[:space:]]*$'; then
  block "git reset --hard with no target ref"
fi

# git clean -fdx (nukes untracked + ignored)
if echo "$cmd" | grep -Eq 'git[[:space:]]+clean[[:space:]]+(-[A-Za-z]*f[A-Za-z]*d[A-Za-z]*x[A-Za-z]*|-[A-Za-z]*x[A-Za-z]*f[A-Za-z]*d[A-Za-z]*|-[A-Za-z]*f[A-Za-z]*x[A-Za-z]*d[A-Za-z]*)'; then
  block "git clean -fdx (removes ignored files too)"
fi

# Dropping an entire database / schema
if echo "$cmd" | grep -Eiq '(DROP[[:space:]]+DATABASE|DROP[[:space:]]+SCHEMA)'; then
  block "DROP DATABASE / DROP SCHEMA in SQL"
fi

# Deleting the entire showcase or pixelcreator-devkit dir
if echo "$cmd" | grep -Eq 'rm[[:space:]]+-[A-Za-z]*r[A-Za-z]*f[A-Za-z]*[[:space:]]+(\./)?(pixelcreator-devkit|showcase)(/|[[:space:]]|$)'; then
  block "rm -rf of pixelcreator-devkit or showcase dir"
fi

# --no-verify on commit or push (skips hooks) — require explicit user action
if echo "$cmd" | grep -Eq 'git[[:space:]]+(commit|push)[[:space:]].*--no-verify'; then
  block "git commit/push --no-verify (skips hooks)"
fi

exit 0
