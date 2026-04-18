---
name: build-fix
description: Incrementally fix build and type errors in PixelCreator with minimal, safe changes. Triggers when pnpm build fails or tsc reports errors.
---

# Build Fix Skill

Incrementally fix build/type errors in the PixelCreator monorepo with the smallest possible change per error.

## Step 1: Detect and Run

Dependency order matters: core → cli → studio.

```bash
pnpm -r build                                # all
pnpm --filter @pixelcreator/core build       # core first
pnpm --filter @pixelcreator/cli build        # depends on core
pnpm --filter @pixelcreator/studio build     # depends on core
```

Type-check only:
```bash
pnpm --filter @pixelcreator/core exec tsc --noEmit
```

## Step 2: Parse and Group

1. Run build, capture errors.
2. Group by package (core → cli → studio).
3. Sort by dependency order (fix core types before downstream consumers).
4. Count total for progress tracking.

## Step 3: Fix Loop (one error at a time)

For each:
1. **Read file** — 10 lines around the error.
2. **Diagnose** — missing import, wrong type, syntax?
3. **Fix minimally** — smallest change that resolves the error.
4. **Re-run build** — error gone, no new errors introduced.
5. **Next**.

## Step 4: Guardrails

STOP and ask the user if:
- A fix introduces more errors than it resolves.
- Same error persists after 3 attempts.
- Fix needs architectural changes.
- Missing dependency requires `pnpm add`.

## Step 5: Summary

```
Build Fix Summary
─────────────────
Fixed:     N errors (list file paths)
Remaining: N errors (list with suggested fixes)
New:       0 (should always be zero)
```

## Common Issues

| Issue | Fix |
|-------|-----|
| Missing `.js` extension in import | Add `.js` to import path |
| Type not exported from core | Add to `packages/core/src/index.ts` |
| Core type changed, downstream broken | Update consumers to match |
| Missing dep | `pnpm --filter @pixelcreator/<pkg> add <dep>` |

$ARGUMENTS
