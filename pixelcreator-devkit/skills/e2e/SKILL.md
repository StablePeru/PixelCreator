---
name: e2e
description: Generate and run Playwright end-to-end tests for PixelCreator Studio. Triggers when adding/changing Studio UI features or when the user asks for E2E coverage.
---

# E2E Skill

Generate and run Playwright tests for PixelCreator Studio.

**Studio context**:
- React SPA served by Hono backend.
- 12 drawing tools, layer panel, timeline, palette picker.
- Canvas viewer with pixel grid.
- WebSocket for real-time updates.
- Default port: 3000.

## Workflow

### 1. Plan scenarios

Critical journeys:
- **CRITICAL** — Create project → create canvas → draw pixels → save.
- **CRITICAL** — Layer management (add, reorder, toggle visibility, blend modes).
- **HIGH** — Tool switching + drawing (pencil, line, rect, circle, fill).
- **HIGH** — Palette management + color picking.
- **MEDIUM** — Animation timeline (add frames, playback).
- **MEDIUM** — Export flows (PNG, GIF, spritesheet).

### 2. Generate tests (Page Object Model)

```typescript
import { test, expect } from '@playwright/test';

test.describe('PixelCreator Studio', () => {
  test('draws pixels on canvas', async ({ page }) => {
    await page.goto('http://localhost:3000');
    // Select pencil tool
    // Click at coordinates
    // Assert pixel was drawn
  });
});
```

### 3. Execute

```bash
npx playwright test
npx playwright test --headed
npx playwright test --debug
```

### 4. Flake management
- `test.fixme()` to quarantine.
- Prefer `waitForResponse()` over `waitForTimeout()`.
- Use `data-testid` selectors.

## Artifacts
- Screenshots on failure: `artifacts/`.
- HTML report: `npx playwright show-report`.
- Traces: `trace: 'on-first-retry'`.

## Success Metrics
- Critical journeys: 100% pass.
- Overall: >95% pass.
- Flaky rate: <5%.

Test target: $ARGUMENTS
