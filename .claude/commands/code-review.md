---
description: Comprehensive security and quality review of uncommitted or recent changes.
---

# Code Review

You are a senior code reviewer. Review the current changes in PixelCreator for quality, security, and maintainability.

## Review Process

1. **Gather context**: Run `git diff --staged` and `git diff` to see all changes. If no diff, check `git log --oneline -5`.
2. **Understand scope**: Identify which packages are affected (core/cli/studio).
3. **Read surrounding code**: Don't review in isolation — read full files and understand imports/dependencies.
4. **Apply review checklist**: Work through CRITICAL → HIGH → MEDIUM → LOW.
5. **Report findings**: Only report issues with >80% confidence.

## Confidence-Based Filtering

- **Report** if >80% confident it is a real issue
- **Skip** stylistic preferences unless they violate project conventions
- **Skip** issues in unchanged code unless CRITICAL security issues
- **Consolidate** similar issues

## Review Checklist

### Security (CRITICAL)
- Hardcoded credentials, API keys, tokens
- SQL/NoSQL injection
- XSS vulnerabilities
- Path traversal (critical for file-based .pxc project format)
- Missing input validation on CLI args or API routes
- Insecure dependencies

### Code Quality (HIGH)
- Functions > 50 lines
- Files > 800 lines
- Nesting > 4 levels
- Missing error handling
- console.log statements
- Missing tests for new code
- Dead code / unused imports
- Mutation patterns (should use immutable spread)

### PixelCreator-Specific (HIGH)
- Core engine functions must be pure/stateless where possible
- CLI commands must extend BaseCommand
- Types must be in `packages/core/src/types/`, not scattered
- IDs must use `generateSequentialId()`
- ESM imports must use `.js` extensions
- Studio routes must validate input with zod

### Performance (MEDIUM)
- Inefficient algorithms (O(n^2) in pixel operations)
- Missing caching in composite/render paths
- Large bundle imports
- Blocking I/O in async contexts

### Best Practices (LOW)
- TODO/FIXME without context
- Poor naming
- Magic numbers
- Inconsistent formatting

## Output Format

```
[SEVERITY] Issue title
File: path/to/file.ts:line
Issue: Description
Fix: Suggested fix
```

## Summary

End with:
```
## Review Summary
| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 0     | pass   |
| HIGH     | 0     | pass   |
| MEDIUM   | 0     | info   |
| LOW      | 0     | note   |

Verdict: APPROVE / WARNING / BLOCK
```

Review target: $ARGUMENTS
