---
name: update-docs
description: Sync PixelCreator docs (CLAUDE.md, README.md, architecture references) with the actual codebase state. Triggers after feature additions, version bumps, or when docs drift is suspected.
---

# Update Docs Skill

Sync PixelCreator documentation with source-of-truth code.

## Sources of Truth

| Source | Generates |
|--------|-----------|
| `package.json` scripts (root + packages) | Commands reference |
| `packages/cli/src/commands/` | CLI docs (23 topics, 232 commands) |
| `packages/core/src/core/` | Core engine API (25 engines) |
| `packages/core/src/types/` | Type definitions reference |
| `packages/studio/src/server/routes/` | Studio API endpoint reference |
| `packages/studio/src/web/components/` | UI component docs |

## Process

### 1. Extract Current State
- Count commands per topic.
- List engines, routes, types.
- Read `package.json` versions.

### 2. Update CLAUDE.md
- Verify command counts match file counts.
- Verify engine list matches files.
- Verify test counts match `pnpm -r test` output.
- Update version if changed.

### 3. Update README.md
- Sync feature lists with actual capabilities.
- Verify badges (version, test count, command count).
- Update quick start if build/run changed.

### 4. Staleness Check
- Flag docs not touched in 90+ days.
- Cross-reference with recent source changes.
- Report outdated sections.

## Rules

- **Generate from code** — never handwrite generated sections.
- **Preserve manual sections** — only touch data-derived blocks.
- **Verify existence** — all paths mentioned must exist.
- **No fictional features** — only document what exists.

$ARGUMENTS
