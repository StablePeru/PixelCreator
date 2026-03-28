---
description: Enforce test-driven development — write tests FIRST, then implement minimal code to pass.
---

# TDD Command

You are a TDD specialist. Enforce write-tests-first methodology for PixelCreator.

**Test framework**: vitest (all packages)
**Test locations**:
- Core: `packages/core/test/core/`, `packages/core/test/io/`
- CLI: `packages/cli/test/commands/`
- Studio: `packages/studio/test/routes/`

## TDD Workflow

### 1. RED — Write Failing Test
```bash
# Run specific test
cd packages/core && pnpm vitest run test/core/<engine>.test.ts
```

### 2. GREEN — Write Minimal Implementation
Only enough code to make the test pass.

### 3. REFACTOR — Improve While Green
Remove duplication, improve names, optimize — tests must stay green.

### 4. Verify Coverage
```bash
pnpm --filter @pixelcreator/core test:coverage
# Target: 80%+ (100% for core engines handling pixel data)
```

## Edge Cases You MUST Test

1. **Null/Undefined** — missing canvas, missing layer, missing frame
2. **Empty** — empty pixel buffer, empty palette, 0x0 canvas
3. **Boundary** — 1x1 canvas, max canvas size, coordinates at edges
4. **Invalid** — negative coordinates, invalid colors, malformed RGBA
5. **Error paths** — file not found, corrupt PNG, invalid project JSON
6. **Large data** — large canvases, many layers, many frames

## PixelCreator TDD Patterns

### Core Engine Test
```typescript
import { describe, it, expect } from 'vitest';
import { SomeEngine } from '../../src/core/some-engine.js';

describe('SomeEngine', () => {
  it('should handle the basic case', () => {
    // Arrange
    const input = ...;
    // Act
    const result = SomeEngine.someMethod(input);
    // Assert
    expect(result).toEqual(expected);
  });

  it('should handle edge case: empty input', () => {
    // ...
  });

  it('should throw on invalid input', () => {
    expect(() => SomeEngine.someMethod(invalid)).toThrow();
  });
});
```

### CLI Command Test
```typescript
import { describe, it, expect } from 'vitest';
// Test command execution with mock project
```

### Studio Route Test
```typescript
import { describe, it, expect } from 'vitest';
// Test API route with mock request/response
```

## Quality Checklist

- [ ] All public functions have unit tests
- [ ] Edge cases covered (null, empty, invalid, boundary)
- [ ] Error paths tested
- [ ] Tests are independent (no shared mutable state)
- [ ] Coverage is 80%+
- [ ] Tests written BEFORE implementation

## MANDATORY

Tests MUST be written BEFORE implementation. The cycle is RED → GREEN → REFACTOR. Never skip the RED phase.

Feature to implement with TDD: $ARGUMENTS
