---
name: verify
description: Run comprehensive pre-commit verification on PixelCreator (build + types + lint + tests + console.log audit). Triggers before commits, after finishing a feature, or when the user asks "is this ready to ship?".
---

# Verify Skill

Run comprehensive verification on PixelCreator in this exact order.

## 1. Build Check
```bash
pnpm -r build
```
If it fails, report errors and STOP.

## 2. Type Check
```bash
pnpm --filter @pixelcreator/core exec tsc --noEmit
pnpm --filter @pixelcreator/cli exec tsc --noEmit
pnpm --filter @pixelcreator/studio exec tsc --noEmit
```
Report all errors with file:line.

## 3. Lint Check
```bash
pnpm -r lint
```

## 4. Test Suite
```bash
pnpm -r test
```
Report pass/fail count per package.

## 5. `console.log` Audit (production code only)
Use Grep on `packages/*/src/**/*.{ts,tsx}` for `console\.log` — skip test files.

## 6. Git Status
Show uncommitted/untracked files.

## Output Format

```
VERIFICATION: [PASS/FAIL]

Build:    [OK/FAIL]
Types:    [OK/X errors]
Lint:     [OK/X issues]
Tests:    [X/Y passed] (core: X, cli: X, studio: X)
Logs:     [OK/X console.logs found]
Git:      [X files modified, Y untracked]

Ready for commit: [YES/NO]
```

If any critical issue is present, list it with a fix suggestion.

## Arguments

`$ARGUMENTS` can be:
- `quick` — build + types only
- `full` — all checks (default)
- `core` | `cli` | `studio` — scope to a single package
