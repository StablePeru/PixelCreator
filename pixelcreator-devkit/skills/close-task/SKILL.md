---
name: close-task
description: Close the current task cleanly — run verify, refresh codemaps/docs, drop the finished step from ROADMAP.md, append to CHANGELOG [Unreleased], commit with a conventional message, and push to origin/main. Triggers when the user says "cierra la tarea", "finaliza", "ship it", "empuja esto", "cerrar paso del roadmap", or equivalent end-of-task phrasing.
---

# Close Task Skill

End-of-task pipeline for PixelCreator. Runs full verification, updates all docs, and pushes to `main`.

Direct push to `main` is authorized for this project (see memory `feedback_git_workflow.md`). Never bypass hooks.

## Preconditions

Abort early and report if any of these fails:

1. **On `main` branch** — `git rev-parse --abbrev-ref HEAD` must return `main`. If not, stop and ask.
2. **Tree has changes** — `git status --porcelain` must be non-empty. If empty, nothing to close; stop.
3. **No `.env*` in the diff** — grep the staged + unstaged file list; abort if present.

## Pipeline

Run sequentially. A failure at any step halts the pipeline and reports the cause.

### 1. Verify (build + types + lint + tests)

Invoke the **verify** skill in `full` mode. Must return `PASS` on all rows. If it fails, stop — fix the underlying issue and re-run `/pxdk:close-task`.

### 2. Refresh codemaps (conditional)

Trigger **update-codemaps** only when the diff touches one of:

- `packages/core/src/types/**`
- `packages/core/src/index.ts`
- `packages/core/src/core/**`

Otherwise skip.

### 3. Refresh docs

Invoke **update-docs** to sync `CLAUDE.md`, `README.md`, and any `docs/` pages whose source-of-truth has shifted (command counts, engine counts, version badges, route counts).

### 4. Prune ROADMAP.md

If a step in `ROADMAP.md` is now complete, **delete the entire section** (heading + body) — do not mark it ✓ or move it to a "Done" list. Memory `feedback_roadmap_workflow.md` is explicit: the roadmap is a live queue, not a log. `git log` and `CHANGELOG.md` are the history.

Renumber remaining sections so the next pending step is `## 1. …`.

### 5. Append to CHANGELOG `[Unreleased]`

Follow Keep-a-Changelog. If `[Unreleased]` does not exist at the top of `CHANGELOG.md`, create it. Group lines under `Added` / `Changed` / `Fixed` / `Deprecated` / `Removed` / `Security` as applicable. Write user-facing descriptions — not commit subjects.

### 6. Commit

Stage only files you intentionally changed — never `git add -A` blindly. Prefer listing paths.

Commit message follows Conventional Commits, scoped to the primary package or area:

```
<type>(<scope>): <subject>

<optional body explaining the *why* in 1–3 sentences>
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`.

Use a HEREDOC to preserve formatting. Never `--no-verify`. Let husky + lint-staged run.

### 7. Push to `origin main`

```bash
git push origin main
```

If the push is rejected (remote ahead), do not force. Stop and report — the user will rebase or resolve manually.

### 8. Final report

One sentence. Include: commit hash (short), what closed, and push status.

Example:
> Cerrado paso 1 del roadmap (asset:list + maxColors enforcement). Commit `a1b2c3d`, push a `main` OK.

## Abort rules

- Tests red → stop at step 1.
- Merge conflict or rejected push → stop, never force.
- Secrets detected in the diff (`.env*`, API keys) → stop immediately.
- User cancels between steps → leave the working tree as-is.

## Arguments

`$ARGUMENTS` can be:

- A scope override: `cli` | `core` | `studio` — narrows step 1 to the single package (`pnpm --filter @pixelcreator/<scope> ...`).
- `--skip-roadmap` — skip step 4 when the work is a cross-cutting refactor unrelated to the current roadmap head.
- `--draft` — run steps 1–5 but stop before commit (useful to preview what would be shipped).
