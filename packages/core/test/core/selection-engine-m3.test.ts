import { describe, it, expect } from 'vitest';
import {
  createLassoSelection,
  createPolygonSelection,
  getSelectionBounds,
  getSelectionPixelCount,
  mergeSelections,
} from '../../src/core/selection-engine.js';

describe('createLassoSelection', () => {
  it('creates a selection from a triangle', () => {
    // Triangle: (5,1) (1,9) (9,9) on a 10x10 canvas
    const mask = createLassoSelection(10, 10, [
      { x: 5, y: 1 },
      { x: 1, y: 9 },
      { x: 9, y: 9 },
    ]);
    expect(mask.width).toBe(10);
    expect(mask.height).toBe(10);
    const count = getSelectionPixelCount(mask);
    expect(count).toBeGreaterThan(0);
    // Center of triangle should be selected
    expect(mask.data[5 * 10 + 5]).toBe(255);
  });

  it('throws for fewer than 3 points', () => {
    expect(() => createLassoSelection(10, 10, [{ x: 0, y: 0 }, { x: 5, y: 5 }])).toThrow(
      'at least 3 points',
    );
  });

  it('throws for empty points', () => {
    expect(() => createLassoSelection(10, 10, [])).toThrow('at least 3 points');
  });

  it('fills a square polygon correctly', () => {
    // Square: (2,2) (7,2) (7,7) (2,7) on 10x10
    const mask = createLassoSelection(10, 10, [
      { x: 2, y: 2 },
      { x: 7, y: 2 },
      { x: 7, y: 7 },
      { x: 2, y: 7 },
    ]);
    // Interior pixels should be selected
    expect(mask.data[4 * 10 + 4]).toBe(255);
    expect(mask.data[3 * 10 + 3]).toBe(255);
    expect(mask.data[6 * 10 + 6]).toBe(255);
    // Outside should not be selected
    expect(mask.data[0 * 10 + 0]).toBe(0);
    expect(mask.data[9 * 10 + 9]).toBe(0);
  });

  it('handles points outside canvas bounds gracefully', () => {
    const mask = createLassoSelection(10, 10, [
      { x: -5, y: -5 },
      { x: 15, y: -5 },
      { x: 15, y: 15 },
      { x: -5, y: 15 },
    ]);
    // Entire canvas should be selected (polygon is bigger than canvas)
    const count = getSelectionPixelCount(mask);
    expect(count).toBe(100);
  });

  it('returns bounds matching the rasterized area', () => {
    const mask = createLassoSelection(20, 20, [
      { x: 5, y: 5 },
      { x: 15, y: 5 },
      { x: 15, y: 15 },
      { x: 5, y: 15 },
    ]);
    const bounds = getSelectionBounds(mask);
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(5);
    expect(bounds!.y).toBeGreaterThanOrEqual(5);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(16);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(16);
  });

  it('supports add mode via mergeSelections', () => {
    const mask1 = createLassoSelection(10, 10, [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 4 },
      { x: 0, y: 4 },
    ]);
    const mask2 = createLassoSelection(10, 10, [
      { x: 5, y: 5 },
      { x: 9, y: 5 },
      { x: 9, y: 9 },
      { x: 5, y: 9 },
    ]);
    const merged = mergeSelections(mask1, mask2);
    const count1 = getSelectionPixelCount(mask1);
    const count2 = getSelectionPixelCount(mask2);
    const countMerged = getSelectionPixelCount(merged);
    // No overlap, so merged should be sum
    expect(countMerged).toBe(count1 + count2);
  });

  it('handles concave polygon', () => {
    // L-shape: concave polygon
    const mask = createLassoSelection(10, 10, [
      { x: 1, y: 1 },
      { x: 5, y: 1 },
      { x: 5, y: 5 },
      { x: 3, y: 5 },
      { x: 3, y: 3 },
      { x: 1, y: 3 },
    ]);
    const count = getSelectionPixelCount(mask);
    expect(count).toBeGreaterThan(0);
    // Inside the L should be selected
    expect(mask.data[2 * 10 + 2]).toBe(255);
    expect(mask.data[4 * 10 + 4]).toBe(255);
    // The concave notch (4,4 area near 3,4) depends on exact rasterization
  });

  it('produces empty mask for degenerate collinear points', () => {
    // 3 collinear points — forms a zero-area polygon
    const mask = createLassoSelection(10, 10, [
      { x: 0, y: 5 },
      { x: 5, y: 5 },
      { x: 10, y: 5 },
    ]);
    const count = getSelectionPixelCount(mask);
    // Collinear points produce 0 or near-0 area
    expect(count).toBeLessThanOrEqual(1);
  });
});

describe('createPolygonSelection', () => {
  it('creates a selection from polygon vertices', () => {
    const mask = createPolygonSelection(10, 10, [
      { x: 2, y: 2 },
      { x: 8, y: 2 },
      { x: 8, y: 8 },
      { x: 2, y: 8 },
    ]);
    expect(mask.width).toBe(10);
    expect(mask.height).toBe(10);
    expect(mask.data[5 * 10 + 5]).toBe(255);
  });

  it('throws for fewer than 3 vertices', () => {
    expect(() =>
      createPolygonSelection(10, 10, [{ x: 0, y: 0 }, { x: 5, y: 5 }]),
    ).toThrow('at least 3 vertices');
  });

  it('produces same result as lasso for identical points', () => {
    const points = [
      { x: 3, y: 1 },
      { x: 7, y: 1 },
      { x: 9, y: 5 },
      { x: 5, y: 9 },
      { x: 1, y: 5 },
    ];
    const lasso = createLassoSelection(10, 10, points);
    const polygon = createPolygonSelection(10, 10, points);
    expect(lasso.data).toEqual(polygon.data);
  });

  it('creates a triangle selection', () => {
    const mask = createPolygonSelection(20, 20, [
      { x: 10, y: 2 },
      { x: 2, y: 18 },
      { x: 18, y: 18 },
    ]);
    const count = getSelectionPixelCount(mask);
    expect(count).toBeGreaterThan(50);
    // Centroid should be selected
    expect(mask.data[12 * 20 + 10]).toBe(255);
    // Top-left corner should not
    expect(mask.data[0]).toBe(0);
  });

  it('handles pentagon', () => {
    const mask = createPolygonSelection(16, 16, [
      { x: 8, y: 1 },
      { x: 14, y: 5 },
      { x: 12, y: 13 },
      { x: 4, y: 13 },
      { x: 2, y: 5 },
    ]);
    const count = getSelectionPixelCount(mask);
    expect(count).toBeGreaterThan(40);
    // Center should be selected
    expect(mask.data[7 * 16 + 8]).toBe(255);
  });
});
