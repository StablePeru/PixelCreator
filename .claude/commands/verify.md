---
description: Run comprehensive verification on PixelCreator codebase.
---

# Verification

Run comprehensive verification on PixelCreator in this exact order:

## 1. Build Check
```bash
pnpm -r build
```
If it fails, report errors and STOP.

## 2. Type Check
```bash
pnpm --filter @pixelcreator/core exec tsc --noEmit
```
Report all errors with file:line.

## 3. Lint Check
```bash
pnpm -r lint
```
Report warnings and errors.

## 4. Test Suite
```bash
pnpm -r test
```
Report pass/fail count per package. Report coverage if available.

## 5. Console.log Audit
Search for `console.log` in source files (not test files):
```bash
grep -r "console.log" packages/*/src/ --include="*.ts" --include="*.tsx"
```

## 6. Git Status
Show uncommitted changes and modified files.

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

If any critical issues, list them with fix suggestions.

## Arguments
$ARGUMENTS can be:
- `quick` — Only build + types
- `full` — All checks (default)
- `core` — Only check @pixelcreator/core
- `cli` — Only check @pixelcreator/cli
- `studio` — Only check @pixelcreator/studio
