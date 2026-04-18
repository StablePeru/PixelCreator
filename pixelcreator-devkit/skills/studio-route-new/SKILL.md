---
name: studio-route-new
description: Scaffold a Studio REST route (Hono) plus optional matching React component that wraps a core engine. Triggers when adding an endpoint under packages/studio/src/server/routes/ and/or a UI affordance under web/components/.
---

# Studio-Route-New Skill

Scaffold a new Hono route and optionally a matching React component, both wrapping a core engine.

## Pre-checks

1. Confirm the backing engine exists in `@pixelcreator/core`.
2. Identify route file location: `packages/studio/src/server/routes/<resource>.ts` (extend an existing resource file when possible instead of creating a new one).
3. Identify matching component (if UI is needed): `packages/studio/src/web/components/<ComponentName>.tsx`.

## Files to create/modify

### 1. zod schema
Inside the route file (or a shared schema file):

```typescript
import { z } from 'zod';

export const <name>InputSchema = z.object({
  canvas: z.string().min(1),
  // domain fields
});

export type <Name>Input = z.infer<typeof <name>InputSchema>;
```

### 2. Hono route handler
`packages/studio/src/server/routes/<resource>.ts`:

```typescript
import type { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { <Name>Engine } from '@pixelcreator/core';
import { <name>InputSchema } from './<resource>.schema.js';
import { getProject } from '../project-context.js';

export function register<Name>Routes(app: Hono) {
  app.post(
    '/api/<resource>/<action>',
    zValidator('json', <name>InputSchema),
    async (c) => {
      const input = c.req.valid('json');
      const project = getProject(c);
      const buffer = project.getCanvas(input.canvas);
      const result = <Name>Engine.apply(buffer, { /* map */ });
      await project.setCanvas(input.canvas, result.buffer);
      return c.json({ ok: true, data: { canvas: input.canvas } });
    },
  );
}
```

Register the function in `packages/studio/src/server/app.ts` (or equivalent bootstrap).

### 3. React component (if UI)
`packages/studio/src/web/components/<Component>.tsx`:

```tsx
import { useState } from 'react';
import { useProjectContext } from '../context/ProjectContext.js';

export function <Component>() {
  const { activeCanvas, refresh } = useProjectContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApply() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/<resource>/<action>', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ canvas: activeCanvas }),
      });
      if (!res.ok) throw new Error(await res.text());
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="<component>-panel">
      <button
        className="btn"
        onClick={handleApply}
        disabled={loading || !activeCanvas}
        data-testid="<component>-apply"
      >
        {loading ? 'Applying…' : 'Apply <Name>'}
      </button>
      {error && <div className="error" role="alert">{error}</div>}
    </div>
  );
}
```

### 4. Route test
`packages/studio/test/routes/<resource>-<action>.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { createTestApp } from '../utils/test-app.js';

describe('POST /api/<resource>/<action>', () => {
  it('applies on a valid canvas', async () => {
    const app = await createTestApp();
    const res = await app.request('/api/<resource>/<action>', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ canvas: 'main' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it('rejects invalid input with 400', async () => { /* ... */ });
});
```

## After scaffolding

- Run `pnpm --filter @pixelcreator/studio build`.
- Start dev server (`pnpm --filter @pixelcreator/studio dev`) and smoke-test the component.
- If the component is wired to realtime, emit a WS event too.

## Anti-patterns

- Don't skip zod validation — every route must validate input.
- Don't put engine logic in the route — delegate to `@pixelcreator/core`.
- Don't mutate React state — spread.
- Don't use array index as key in dynamic lists.
- Don't hardcode colors — use CSS vars (`var(--color-accent)`).

Route/component to scaffold: $ARGUMENTS
