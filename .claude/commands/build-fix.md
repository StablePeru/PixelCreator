---
description: Incrementally fix build and type errors with minimal, safe changes.
---

# Build Fix

Incrementally fix build and type errors in PixelCreator with minimal changes.

## Step 1: Detect and Run Build

PixelCreator build order (dependencies matter):
```bash
# Full build
pnpm -r build

# Or incremental
pnpm --filter @pixelcreator/core build    # Must build first
pnpm --filter @pixelcreator/cli build     # Depends on core
pnpm --filter @pixelcreator/studio build  # Depends on core
```

Type check only:
```bash
pnpm --filter @pixelcreator/core exec tsc --noEmit
```

## Step 2: Parse and Group Errors

1. Run build and capture errors
2. Group by package (core → cli → studio)
3. Sort by dependency order (fix core types before cli/studio errors)
4. Count total errors for progress tracking

## Step 3: Fix Loop (One Error at a Time)

For each error:
1. **Read the file** — see error context (10 lines around)
2. **Diagnose** — missing import, wrong type, syntax error?
3. **Fix minimally** — smallest change that resolves the error
4. **Re-run build** — verify error gone, no new errors introduced
5. **Move to next**

## Step 4: Guardrails

**STOP and ask the user if:**
- A fix introduces more errors than it resolves
- Same error persists after 3 attempts
- Fix requires architectural changes
- Missing dependencies need `pnpm add`

## Step 5: Summary

```
Build Fix Summary
─────────────────
Fixed: N errors (list file paths)
Remaining: N errors (list with suggested fixes)
New errors: 0 (should always be zero)
```

## Common PixelCreator Build Issues

| Issue | Fix |
|-------|-----|
| Missing `.js` extension in import | Add `.js` to the import path |
| Type not exported from core | Add to `packages/core/src/index.ts` barrel |
| Core type changed, cli/studio broken | Update consumers to match new type |
| Missing dependency | `pnpm --filter @pixelcreator/<pkg> add <dep>` |

$ARGUMENTS
