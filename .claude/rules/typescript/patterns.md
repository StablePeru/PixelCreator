---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---
# TypeScript Patterns

## API Response Format

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

## Repository Pattern

```typescript
interface Repository<T> {
  findAll(filters?: Filters): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  create(data: CreateDto): Promise<T>;
  update(id: string, data: UpdateDto): Promise<T>;
  delete(id: string): Promise<void>;
}
```

## PixelCreator Engine Pattern

All core engines follow a static-method or class pattern:
- Accept typed input (from `packages/core/src/types/`)
- Return typed output
- No side effects (pure where possible)
- Use `PixelBuffer` for pixel data
