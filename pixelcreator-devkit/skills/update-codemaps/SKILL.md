---
name: update-codemaps
description: Generate token-lean architecture maps of the PixelCreator codebase under docs/CODEMAPS/. Triggers after major refactors or when the user asks for an updated architecture snapshot.
---

# Update Codemaps Skill

Analyze PixelCreator and generate token-lean architecture documentation.

## Step 1: Scan

Monorepo map:
- `packages/core/src/core/` — engines.
- `packages/core/src/io/` — I/O modules.
- `packages/core/src/types/` — type defs.
- `packages/core/src/utils/` — utilities.
- `packages/cli/src/commands/` — oclif command topics.
- `packages/studio/src/server/routes/` — API routes.
- `packages/studio/src/web/components/` — React components.
- `packages/studio/src/web/tools/` — drawing tools.
- `packages/studio/src/web/context/` — React contexts.

## Step 2: Generate

Under `docs/CODEMAPS/`:

| File | Contents |
|------|----------|
| `architecture.md` | Monorepo diagram, package deps, data flow |
| `core-engines.md` | Name → purpose → exports → deps |
| `cli-commands.md` | Topic → command list → engine called |
| `studio-api.md` | Route → method → handler → engine wrapped |
| `studio-ui.md` | Component tree, tools, contexts, state flow |
| `types.md` | Type file → exports → consumers |

### Format

```markdown
# [Area] Codemap
**Last Updated:** YYYY-MM-DD
**Files scanned:** N

## Architecture
[ASCII diagram]

## Key Modules
| Module | Purpose | Exports | Dependencies |

## Data Flow
[how data flows]
```

## Step 3: Diff

If previous maps exist:
- Compute diff %.
- If >30% changed, show diff and request approval before overwrite.

## Tips

- ≤1000 tokens per codemap.
- File paths + function signatures, not full code.
- ASCII diagrams for flow.
- High-level structure only.

$ARGUMENTS
