---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---
# TypeScript Coding Style

## Types and Interfaces

- Add explicit types to exported functions and public APIs
- Let TypeScript infer obvious local variable types
- Use `interface` for object shapes, `type` for unions/intersections/utilities
- Prefer string literal unions over `enum`

## Avoid `any`

- Use `unknown` for external/untrusted input, then narrow safely
- Use generics when type depends on caller

## Immutability

Use spread operators:
```typescript
// WRONG: user.name = name
// CORRECT: return { ...user, name }
```

## Error Handling

```typescript
async function loadData(): Promise<Data> {
  try {
    return await riskyOperation();
  } catch (error: unknown) {
    if (error instanceof Error) throw error;
    throw new Error('Unexpected error');
  }
}
```

## Input Validation (Zod)

```typescript
import { z } from 'zod';
const schema = z.object({ ... });
type Input = z.infer<typeof schema>;
```

## No console.log in production code
