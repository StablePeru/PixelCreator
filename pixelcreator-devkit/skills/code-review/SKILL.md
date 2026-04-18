---
name: code-review
description: Comprehensive security and quality review of uncommitted or recent changes in PixelCreator. Triggers when the user asks for review, feedback, or "does this look good?" on a diff.
---

# Code Review Skill

You are a senior code reviewer for PixelCreator. Review quality, security, and maintainability of current changes.

## Process

1. **Gather context**: `git diff --staged` and `git diff`. If empty, check `git log --oneline -5`.
2. **Scope**: identify which packages (core/cli/studio) changed.
3. **Read surroundings**: never review in isolation. Read full files + imports.
4. **Apply checklist**: CRITICAL → HIGH → MEDIUM → LOW.
5. **Report**: only issues with >80% confidence.

## Confidence Filter

- Report only if >80% confident it's real.
- Skip stylistic preferences unless they violate `pixelcreator-devkit/rules/`.
- Skip unchanged-code issues unless CRITICAL security.
- Consolidate similar issues.

## Checklist

### Security (CRITICAL)
- Hardcoded credentials, API keys, tokens.
- Injection (SQL/NoSQL/command).
- XSS (check `dangerouslySetInnerHTML`).
- Path traversal — **critical** for the file-based `.pxc` format.
- Missing input validation on CLI args or Studio routes.
- Insecure dependencies.

### Code Quality (HIGH)
- Functions > 50 lines.
- Files > 800 lines.
- Nesting > 4 levels.
- Missing error handling.
- `console.log` leftovers.
- Missing tests for new code.
- Mutation patterns instead of immutable spread.

### PixelCreator-Specific (HIGH)
- Core engines should be pure/stateless where possible.
- CLI commands must extend `BaseCommand`.
- Types live in `packages/core/src/types/`.
- IDs via `generateSequentialId()`.
- ESM imports with `.js` extensions.
- Studio routes must validate input with zod.

### Performance (MEDIUM)
- Inefficient pixel loops (avoid O(n²) in hot paths).
- Missing caching in composite/render paths.
- Blocking I/O in async contexts.

### Best Practices (LOW)
- TODO/FIXME without context.
- Poor naming, magic numbers, inconsistent formatting.

## Output

Per finding:
```
[SEVERITY] Issue title
File: path/to/file.ts:line
Issue: Description
Fix: Suggested fix
```

End with:
```
## Review Summary
| Severity | Count | Status |
| CRITICAL | 0     | pass   |
| HIGH     | 0     | pass   |
| MEDIUM   | 0     | info   |
| LOW      | 0     | note   |

Verdict: APPROVE / WARNING / BLOCK
```

Review target: $ARGUMENTS
