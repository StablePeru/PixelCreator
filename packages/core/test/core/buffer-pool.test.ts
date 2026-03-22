import { describe, it, expect, beforeEach } from 'vitest';
import { BufferPool } from '../../src/core/buffer-pool.js';

describe('BufferPool', () => {
  beforeEach(() => {
    BufferPool.reset();
  });

  it('acquires new buffer', () => {
    const pool = BufferPool.getInstance();
    const buf = pool.acquire(4, 4);
    expect(buf.width).toBe(4);
    expect(buf.height).toBe(4);
  });

  it('reuses released buffer', () => {
    const pool = BufferPool.getInstance();
    const buf1 = pool.acquire(4, 4);
    pool.release(buf1);
    const buf2 = pool.acquire(4, 4);
    expect(pool.stats.reused).toBe(1);
  });

  it('clears acquired buffer', () => {
    const pool = BufferPool.getInstance();
    const buf1 = pool.acquire(4, 4);
    buf1.setPixel(0, 0, { r: 255, g: 0, b: 0, a: 255 });
    pool.release(buf1);
    const buf2 = pool.acquire(4, 4);
    expect(buf2.getPixel(0, 0).a).toBe(0); // cleared
  });

  it('different sizes get different buffers', () => {
    const pool = BufferPool.getInstance();
    pool.release(pool.acquire(4, 4));
    const buf = pool.acquire(8, 8);
    expect(buf.width).toBe(8);
    expect(pool.stats.reused).toBe(0); // no 8x8 in pool
  });

  it('tracks stats', () => {
    const pool = BufferPool.getInstance();
    pool.acquire(4, 4);
    pool.acquire(4, 4);
    expect(pool.stats.allocated).toBe(2);
  });

  it('clear empties pool', () => {
    const pool = BufferPool.getInstance();
    pool.release(pool.acquire(4, 4));
    pool.clear();
    expect(pool.stats.pooled).toBe(0);
  });

  it('limits pool size per dimension', () => {
    const pool = BufferPool.getInstance();
    for (let i = 0; i < 20; i++) {
      pool.release(pool.acquire(4, 4));
    }
    expect(pool.stats.pooled).toBeLessThanOrEqual(16);
  });
});
