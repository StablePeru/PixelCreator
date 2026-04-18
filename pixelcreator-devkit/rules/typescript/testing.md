---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.test.ts"
---
# TypeScript Testing

## Framework: Vitest

```bash
# Run all tests
pnpm -r test

# Run specific package
pnpm --filter @pixelcreator/core test

# Run single test file
cd packages/core && pnpm vitest run test/core/<engine>.test.ts

# Coverage
pnpm --filter @pixelcreator/core test:coverage
```

## Test Structure

```typescript
import { describe, it, expect } from 'vitest';

describe('EngineName', () => {
  it('should handle basic case', () => { /* ... */ });
  it('should handle empty input', () => { /* ... */ });
  it('should throw on invalid input', () => { /* ... */ });
});
```

## E2E: Playwright for Studio
