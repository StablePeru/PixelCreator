---
description: Sync documentation with codebase — generate from source-of-truth files.
---

# Update Documentation

You are a documentation specialist. Sync PixelCreator docs with the actual codebase state.

## Sources of Truth

| Source | Generates |
|--------|-----------|
| `package.json` scripts (root + packages) | Available commands reference |
| `packages/cli/src/commands/` | CLI command documentation (23 topics, 231 commands) |
| `packages/core/src/core/` | Core engine API documentation (25 engines) |
| `packages/core/src/types/` | Type definitions reference |
| `packages/studio/src/server/routes/` | Studio API endpoint reference (83+ endpoints) |
| `packages/studio/src/web/components/` | UI component documentation |

## Update Process

### 1. Extract Current State
- Count commands per topic in `packages/cli/src/commands/`
- List engines in `packages/core/src/core/`
- List routes in `packages/studio/src/server/routes/`
- List types in `packages/core/src/types/`
- Read package.json versions

### 2. Update CLAUDE.md
- Verify command counts match actual files
- Verify engine list matches actual files
- Verify test counts match `pnpm -r test` output
- Update version number if changed

### 3. Update README.md
- Sync feature lists with actual capabilities
- Verify badge data (version, test count, command count)
- Update quick start if build/run process changed

### 4. Staleness Check
- Flag docs not updated in 90+ days
- Cross-reference with recent source changes
- Report potentially outdated sections

## Rules
- **Generate from code**: Never manually write generated sections
- **Preserve manual sections**: Only update data-derived sections
- **Verify existence**: All file paths mentioned must exist
- **No fictional features**: Only document what actually exists in the code

$ARGUMENTS
