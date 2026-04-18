---
name: engine-new
description: Scaffold a new core engine in packages/core/src/core/ with matching types, barrel export, and vitest test skeleton. Triggers when the user asks to "add a new engine" or introduce a new domain to @pixelcreator/core.
---

# Engine-New Skill

Scaffold a brand-new engine inside `@pixelcreator/core` following the canonical pattern.

## Pre-checks

1. Confirm the engine doesn't already exist (`packages/core/src/core/<name>-engine.ts`).
2. Ask the user for:
   - **Engine name** (kebab-case, e.g., `blur-engine`).
   - **Purpose** (1-2 sentences, used in JSDoc header).
   - **Domain types needed** (new types in `packages/core/src/types/` or reuse existing).
3. Delegate deep architecture reads to the **engine-expert** subagent if scope is ambiguous.

## Files to create

### 1. Type file (if new types needed)
`packages/core/src/types/<domain>.ts`:

```typescript
import type { RGBA } from './common.js';

export interface <Name>Config {
  // fields
}

export interface <Name>Result {
  // fields
}
```

Add to `packages/core/src/types/index.ts` barrel.

### 2. Engine file
`packages/core/src/core/<name>-engine.ts`:

```typescript
import { PixelBuffer } from '../io/png-codec.js';
import type { <Name>Config, <Name>Result } from '../types/<domain>.js';

export class <Name>Engine {
  static apply(buffer: PixelBuffer, config: <Name>Config): <Name>Result {
    // pure, immutable — return new buffer
    const next = buffer.clone();
    // ...
    return { buffer: next /* ... */ };
  }
}
```

### 3. Barrel export
Append to `packages/core/src/index.ts`:

```typescript
export { <Name>Engine } from './core/<name>-engine.js';
export type { <Name>Config, <Name>Result } from './types/<domain>.js';
```

### 4. Test skeleton
`packages/core/test/core/<name>-engine.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { <Name>Engine } from '../../src/core/<name>-engine.js';
import { PixelBuffer } from '../../src/io/png-codec.js';

describe('<Name>Engine', () => {
  it('applies on a minimal buffer', () => {
    const buf = PixelBuffer.create(2, 2);
    const result = <Name>Engine.apply(buf, { /* config */ });
    expect(result.buffer.width).toBe(2);
  });

  it('does not mutate input', () => {
    const buf = PixelBuffer.create(2, 2);
    const before = buf.toHex();
    <Name>Engine.apply(buf, { /* config */ });
    expect(buf.toHex()).toBe(before);
  });

  it('handles empty buffer', () => { /* edge case */ });
  it('throws on invalid config', () => { /* edge case */ });
});
```

## After scaffolding

- Ensure tests fail with intent (RED step of TDD).
- Prompt the user to fill in the engine body (GREEN step).
- Remind: add CLI command (use `cli-command-new` skill) + studio route (use `studio-route-new`) once the engine is green.

## Anti-patterns

- Don't place engine logic outside `packages/core/src/core/`.
- Don't skip the barrel export.
- Don't mutate input buffers.
- Don't forget ESM `.js` extension in imports.

Engine to scaffold: $ARGUMENTS
