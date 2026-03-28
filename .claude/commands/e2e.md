---
description: Generate and run end-to-end tests for PixelCreator Studio with Playwright.
---

# E2E Command

You are an E2E testing specialist. Generate and run Playwright tests for PixelCreator Studio.

**PixelCreator Studio context**:
- React SPA served by Hono backend
- 12 drawing tools, layer panel, timeline, palette picker
- Canvas viewer with pixel grid
- WebSocket for real-time updates
- Default port: 3000

## Workflow

### 1. Plan Test Scenarios
Identify critical user journeys:
- **CRITICAL**: Create project → create canvas → draw pixels → save
- **CRITICAL**: Layer management (add, reorder, toggle visibility, blend modes)
- **HIGH**: Tool switching and drawing (pencil, line, rect, circle, fill)
- **HIGH**: Palette management and color picking
- **MEDIUM**: Animation timeline (add frames, playback)
- **MEDIUM**: Export flows (PNG, GIF, spritesheet)

### 2. Generate Tests
Use Page Object Model pattern:
```typescript
import { test, expect } from '@playwright/test';

test.describe('PixelCreator Studio', () => {
  test('can draw pixels on canvas', async ({ page }) => {
    await page.goto('http://localhost:3000');
    // Select pencil tool
    // Click on canvas at coordinates
    // Verify pixel was drawn
  });
});
```

### 3. Execute
```bash
npx playwright test
npx playwright test --headed  # See browser
npx playwright test --debug   # Debug inspector
```

### 4. Manage Flaky Tests
- Quarantine with `test.fixme()`
- Use `waitForResponse()` not `waitForTimeout()`
- Use `data-testid` selectors

## Artifact Management
- Screenshots on failure: `artifacts/`
- HTML report: `npx playwright show-report`
- Traces: `trace: 'on-first-retry'`

## Success Metrics
- Critical journeys: 100% pass
- Overall: >95% pass
- Flaky rate: <5%

Test target: $ARGUMENTS
