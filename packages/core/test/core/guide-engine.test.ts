import { describe, it, expect } from 'vitest';
import {
  createDefaultGuideConfig,
  createGuide,
  removeGuide,
  moveGuide,
  toggleGuideLock,
  clearGuides,
  snapToGuide,
  validateGuideConfig,
} from '../../src/core/guide-engine.js';
import type { GuideConfig } from '../../src/types/guide.js';

describe('createDefaultGuideConfig', () => {
  it('returns empty config with defaults', () => {
    const config = createDefaultGuideConfig();
    expect(config.guides).toEqual([]);
    expect(config.snapEnabled).toBe(true);
    expect(config.snapThreshold).toBe(4);
    expect(config.visible).toBe(true);
  });
});

describe('createGuide', () => {
  it('adds a horizontal guide', () => {
    const config = createDefaultGuideConfig();
    const updated = createGuide(config, 'horizontal', 8);
    expect(updated.guides).toHaveLength(1);
    expect(updated.guides[0].orientation).toBe('horizontal');
    expect(updated.guides[0].position).toBe(8);
    expect(updated.guides[0].color).toBe('#00ccff');
  });

  it('adds a vertical guide', () => {
    const config = createDefaultGuideConfig();
    const updated = createGuide(config, 'vertical', 16, '#ff0000');
    expect(updated.guides).toHaveLength(1);
    expect(updated.guides[0].orientation).toBe('vertical');
    expect(updated.guides[0].position).toBe(16);
    expect(updated.guides[0].color).toBe('#ff0000');
  });

  it('generates unique IDs for multiple guides', () => {
    let config = createDefaultGuideConfig();
    config = createGuide(config, 'horizontal', 4);
    config = createGuide(config, 'vertical', 8);
    expect(config.guides).toHaveLength(2);
    expect(config.guides[0].id).not.toBe(config.guides[1].id);
  });
});

describe('removeGuide', () => {
  it('removes a guide by ID', () => {
    let config = createDefaultGuideConfig();
    config = createGuide(config, 'horizontal', 8);
    const id = config.guides[0].id;
    config = removeGuide(config, id);
    expect(config.guides).toHaveLength(0);
  });

  it('no-op for missing ID', () => {
    let config = createDefaultGuideConfig();
    config = createGuide(config, 'horizontal', 8);
    config = removeGuide(config, 'nonexistent');
    expect(config.guides).toHaveLength(1);
  });
});

describe('moveGuide', () => {
  it('updates guide position', () => {
    let config = createDefaultGuideConfig();
    config = createGuide(config, 'horizontal', 8);
    const id = config.guides[0].id;
    config = moveGuide(config, id, 16);
    expect(config.guides[0].position).toBe(16);
  });
});

describe('toggleGuideLock', () => {
  it('toggles lock state', () => {
    let config = createDefaultGuideConfig();
    config = createGuide(config, 'horizontal', 8);
    const id = config.guides[0].id;
    expect(config.guides[0].locked).toBe(false);
    config = toggleGuideLock(config, id);
    expect(config.guides[0].locked).toBe(true);
    config = toggleGuideLock(config, id);
    expect(config.guides[0].locked).toBe(false);
  });
});

describe('clearGuides', () => {
  it('removes all guides', () => {
    let config = createDefaultGuideConfig();
    config = createGuide(config, 'horizontal', 4);
    config = createGuide(config, 'vertical', 8);
    config = createGuide(config, 'horizontal', 12);
    expect(config.guides).toHaveLength(3);
    config = clearGuides(config);
    expect(config.guides).toHaveLength(0);
    expect(config.snapEnabled).toBe(true); // other settings preserved
  });
});

describe('snapToGuide', () => {
  const guides = [
    { id: 'g1', orientation: 'vertical' as const, position: 10 },
    { id: 'g2', orientation: 'horizontal' as const, position: 20 },
    { id: 'g3', orientation: 'vertical' as const, position: 30 },
  ];

  it('snaps to vertical guide within threshold', () => {
    const result = snapToGuide(guides, 12, 5, 4);
    expect(result.snapped).toBe(true);
    expect(result.x).toBe(10);
    expect(result.y).toBe(5);
    expect(result.guideIds).toContain('g1');
  });

  it('snaps to horizontal guide within threshold', () => {
    const result = snapToGuide(guides, 5, 18, 4);
    expect(result.snapped).toBe(true);
    expect(result.x).toBe(5);
    expect(result.y).toBe(20);
    expect(result.guideIds).toContain('g2');
  });

  it('does not snap beyond threshold', () => {
    const result = snapToGuide(guides, 15, 15, 4);
    expect(result.snapped).toBe(false);
    expect(result.x).toBe(15);
    expect(result.y).toBe(15);
  });

  it('snaps to nearest of multiple vertical guides', () => {
    const result = snapToGuide(guides, 28, 5, 4);
    expect(result.snapped).toBe(true);
    expect(result.x).toBe(30);
    expect(result.guideIds).toContain('g3');
  });

  it('snaps both axes simultaneously', () => {
    const result = snapToGuide(guides, 12, 18, 4);
    expect(result.snapped).toBe(true);
    expect(result.x).toBe(10);
    expect(result.y).toBe(20);
    expect(result.guideIds).toContain('g1');
    expect(result.guideIds).toContain('g2');
  });

  it('returns empty guideIds when no snap', () => {
    const result = snapToGuide(guides, 50, 50, 4);
    expect(result.guideIds).toHaveLength(0);
  });

  it('handles empty guide list', () => {
    const result = snapToGuide([], 10, 10, 4);
    expect(result.snapped).toBe(false);
    expect(result.x).toBe(10);
    expect(result.y).toBe(10);
  });

  it('snaps to exact position', () => {
    const result = snapToGuide(guides, 10, 20, 4);
    expect(result.snapped).toBe(true);
    expect(result.x).toBe(10);
    expect(result.y).toBe(20);
  });
});

describe('validateGuideConfig', () => {
  it('validates a correct config', () => {
    const config = createDefaultGuideConfig();
    expect(validateGuideConfig(config).valid).toBe(true);
  });

  it('rejects invalid config', () => {
    const result = validateGuideConfig({ guides: 'bad', snapEnabled: 'no' });
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
  });
});
