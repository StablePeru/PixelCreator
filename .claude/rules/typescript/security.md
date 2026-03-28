---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---
# TypeScript Security

## Secret Management

```typescript
// NEVER: const apiKey = "sk-proj-xxxxx"
// ALWAYS: const apiKey = process.env.API_KEY
// ALWAYS: if (!apiKey) throw new Error('API_KEY not configured')
```

## Path Safety (Critical for PixelCreator)

```typescript
import path from 'path';

// ALWAYS validate file paths stay within project directory
function safePath(projectDir: string, userPath: string): string {
  const resolved = path.resolve(projectDir, userPath);
  if (!resolved.startsWith(projectDir)) {
    throw new Error('Path traversal detected');
  }
  return resolved;
}
```

## Input Validation

All CLI args and API params must be validated before use.
Use zod schemas for structured validation.
