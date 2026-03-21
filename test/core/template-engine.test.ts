import { describe, it, expect } from 'vitest';
import { createTemplateFromCanvas, applyTemplate } from '../../src/core/template-engine.js';
import type { CanvasData } from '../../src/types/canvas.js';
import type { TemplateData } from '../../src/types/template.js';

function makeCanvas(): CanvasData {
  return {
    name: 'test',
    width: 32,
    height: 32,
    created: '2026-01-01T00:00:00.000Z',
    modified: '2026-01-01T00:00:00.000Z',
    palette: 'main',
    layers: [
      { id: 'layer-001', name: 'bg', type: 'normal', visible: true, opacity: 255, blendMode: 'normal', locked: false, order: 0 },
      { id: 'layer-002', name: 'fg', type: 'normal', visible: true, opacity: 200, blendMode: 'multiply', locked: false, order: 1 },
    ],
    frames: [
      { id: 'frame-001', index: 0, duration: 100 },
    ],
    animationTags: [],
  };
}

describe('createTemplateFromCanvas', () => {
  it('extracts layer structure', () => {
    const template = createTemplateFromCanvas(makeCanvas());
    expect(template.width).toBe(32);
    expect(template.height).toBe(32);
    expect(template.palette).toBe('main');
    expect(template.layers).toHaveLength(2);
    expect(template.layers[0].name).toBe('bg');
    expect(template.layers[1].blendMode).toBe('multiply');
    expect(template.layers[1].opacity).toBe(200);
  });

  it('does not include layer IDs', () => {
    const template = createTemplateFromCanvas(makeCanvas());
    expect((template.layers[0] as any).id).toBeUndefined();
  });
});

describe('applyTemplate', () => {
  it('creates canvas with template structure', () => {
    const template: TemplateData = {
      name: 'character',
      description: 'Character sprite',
      width: 32,
      height: 32,
      palette: 'main',
      layers: [
        { name: 'outline', type: 'normal', opacity: 255, blendMode: 'normal' },
        { name: 'color', type: 'normal', opacity: 255, blendMode: 'normal' },
        { name: 'shadow', type: 'normal', opacity: 128, blendMode: 'multiply' },
      ],
      tags: {},
      created: '2026-01-01T00:00:00.000Z',
      modified: '2026-01-01T00:00:00.000Z',
    };

    const canvas = applyTemplate(template, 'hero');
    expect(canvas.name).toBe('hero');
    expect(canvas.width).toBe(32);
    expect(canvas.height).toBe(32);
    expect(canvas.palette).toBe('main');
    expect(canvas.layers).toHaveLength(3);
    expect(canvas.layers[0].name).toBe('outline');
    expect(canvas.layers[2].blendMode).toBe('multiply');
    expect(canvas.layers[2].opacity).toBe(128);
    expect(canvas.frames).toHaveLength(1);
  });

  it('overrides width and height', () => {
    const template: TemplateData = {
      name: 'small',
      description: '',
      width: 64,
      height: 64,
      palette: null,
      layers: [{ name: 'bg', type: 'normal', opacity: 255, blendMode: 'normal' }],
      tags: {},
      created: '2026-01-01T00:00:00.000Z',
      modified: '2026-01-01T00:00:00.000Z',
    };

    const canvas = applyTemplate(template, 'tiny', 16, 16);
    expect(canvas.width).toBe(16);
    expect(canvas.height).toBe(16);
  });
});
