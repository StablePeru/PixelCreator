---
description: Generate token-lean architecture maps of the PixelCreator codebase.
---

# Update Codemaps

Analyze the PixelCreator codebase and generate token-lean architecture documentation.

## Step 1: Scan Project Structure

Map the monorepo:
- `packages/core/src/core/` — 25 engine modules
- `packages/core/src/io/` — 12 I/O modules
- `packages/core/src/types/` — Type definitions
- `packages/core/src/utils/` — Utility functions
- `packages/cli/src/commands/` — 23 command topics
- `packages/studio/src/server/routes/` — API routes
- `packages/studio/src/web/components/` — React components
- `packages/studio/src/web/tools/` — Drawing tools
- `packages/studio/src/web/context/` — React contexts

## Step 2: Generate Codemaps

Create/update codemaps in `docs/CODEMAPS/`:

| File | Contents |
|------|----------|
| `architecture.md` | High-level monorepo diagram, package dependencies, data flow |
| `core-engines.md` | Engine index: name → purpose → exports → dependencies |
| `cli-commands.md` | Command topic → command list → which engine each calls |
| `studio-api.md` | Route → method → handler → which engine it wraps |
| `studio-ui.md` | Component tree, tools, contexts, state flow |
| `types.md` | Type file → exported types → which engines/commands use them |

### Codemap Format

```markdown
# [Area] Codemap
**Last Updated:** YYYY-MM-DD
**Files scanned:** N

## Architecture
[ASCII diagram]

## Key Modules
| Module | Purpose | Exports | Dependencies |

## Data Flow
[How data flows through this area]
```

## Step 3: Diff Detection

If previous codemaps exist:
- Calculate diff percentage
- If >30% changed, show diff and ask for approval before overwriting

## Tips

- Keep each codemap under 1000 tokens
- Use file paths and function signatures, not full code
- Focus on high-level structure
- ASCII diagrams for data flow

$ARGUMENTS
