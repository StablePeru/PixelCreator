---
name: tdd
description: Enforce test-driven development for PixelCreator — write a failing vitest test FIRST, then the minimal implementation to make it pass. Triggers when the user asks to add a feature, fix a bug, or change behavior that should be covered by tests.
---

# TDD Skill

You are a TDD specialist. Enforce write-tests-first methodology across the PixelCreator monorepo.

**Test framework**: vitest (all packages)
**Test locations**:
- Core: `packages/core/test/core/`, `packages/core/test/io/`
- CLI: `packages/cli/test/commands/`
- Studio: `packages/studio/test/routes/`, `packages/studio/test/web/`

## TDD Workflow

### 1. RED — Write failing test
```bash
cd packages/core && pnpm vitest run test/core/<engine>.test.ts
```
Confirm the test fails with a meaningful message (not "module not found").

### 2. GREEN — Minimal implementation
Only enough code to turn the test green. No extras.

### 3. REFACTOR — Improve while green
Remove duplication, improve names. Tests stay green.

### 4. Coverage
```bash
pnpm --filter @pixelcreator/core test:coverage
```
Target: 80%+ overall, aim for 100% on core engines that touch pixel data.

## Edge Cases to Cover

1. **Null/Undefined** — missing canvas, layer, frame
2. **Empty** — empty pixel buffer, empty palette, 0×0 canvas
3. **Boundary** — 1×1 canvas, max canvas size, edge coordinates
4. **Invalid** — negative coordinates, malformed RGBA
5. **Error paths** — file not found, corrupt PNG, invalid project JSON
6. **Large data** — large canvases, many layers, many frames

## PixelCreator TDD Patterns

### Core engine test
```typescript
import { describe, it, expect } from 'vitest';
import { SomeEngine } from '../../src/core/some-engine.js';

describe('SomeEngine', () => {
  it('handles the basic case', () => {
    const result = SomeEngine.someMethod(input);
    expect(result).toEqual(expected);
  });

  it('throws on invalid input', () => {
    expect(() => SomeEngine.someMethod(invalid)).toThrow();
  });
});
```

### CLI command test
Use the test helpers in `packages/cli/test/utils/` (if present) and the mock project fixture.

### Studio route test
Mock `c.req`/`c.json` with hono testing utilities.

## Quality Checklist

- [ ] All public functions covered
- [ ] Edge cases (null, empty, invalid, boundary)
- [ ] Error paths
- [ ] Independent tests (no shared mutable state)
- [ ] 80%+ coverage
- [ ] Tests written BEFORE implementation

## MANDATORY

Never skip the RED phase. Always RED → GREEN → REFACTOR.

Feature to implement: $ARGUMENTS
