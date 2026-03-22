import { describe, it, expect, beforeEach } from 'vitest';
import { PixelBuffer } from '../../src/io/png-codec.js';
import { CompositeCache } from '../../src/core/composite-cache.js';

describe('CompositeCache', () => {
  beforeEach(() => {
    CompositeCache.reset();
  });

  it('returns null for cache miss', () => {
    const cache = CompositeCache.getInstance();
    expect(cache.get('frame-001:hash123')).toBeNull();
  });

  it('returns cached buffer on hit', () => {
    const cache = CompositeCache.getInstance();
    const buf = new PixelBuffer(4, 4);
    buf.setPixel(0, 0, { r: 255, g: 0, b: 0, a: 255 });

    const key = cache.makeKey('frame-001', 'layer-config-hash');
    cache.set(key, buf);

    const result = cache.get(key);
    expect(result).not.toBeNull();
    expect(result!.getPixel(0, 0).r).toBe(255);
  });

  it('returns clone (not reference)', () => {
    const cache = CompositeCache.getInstance();
    const buf = new PixelBuffer(4, 4);
    const key = 'test-key';
    cache.set(key, buf);

    const a = cache.get(key)!;
    const b = cache.get(key)!;
    a.setPixel(0, 0, { r: 255, g: 0, b: 0, a: 255 });
    expect(b.getPixel(0, 0).r).toBe(0); // independent clone
  });

  it('tracks hits and misses', () => {
    const cache = CompositeCache.getInstance();
    cache.set('key', new PixelBuffer(2, 2));
    cache.get('key');
    cache.get('missing');
    expect(cache.stats.hits).toBe(1);
    expect(cache.stats.misses).toBe(1);
  });

  it('invalidates by frameId', () => {
    const cache = CompositeCache.getInstance();
    cache.set('frame-001:a', new PixelBuffer(2, 2));
    cache.set('frame-002:a', new PixelBuffer(2, 2));
    cache.invalidate('frame-001');
    expect(cache.get('frame-001:a')).toBeNull();
    expect(cache.get('frame-002:a')).not.toBeNull();
  });

  it('invalidates all', () => {
    const cache = CompositeCache.getInstance();
    cache.set('a', new PixelBuffer(2, 2));
    cache.set('b', new PixelBuffer(2, 2));
    cache.invalidate();
    expect(cache.stats.size).toBe(0);
  });

  it('evicts when full', () => {
    const cache = new CompositeCache(2); // max 2 entries
    cache.set('a', new PixelBuffer(2, 2));
    cache.set('b', new PixelBuffer(2, 2));
    cache.set('c', new PixelBuffer(2, 2)); // should evict one
    expect(cache.stats.size).toBe(2);
  });

  it('clear resets everything', () => {
    const cache = CompositeCache.getInstance();
    cache.set('x', new PixelBuffer(2, 2));
    cache.get('x');
    cache.clear();
    expect(cache.stats.size).toBe(0);
    expect(cache.stats.hits).toBe(0);
  });
});
