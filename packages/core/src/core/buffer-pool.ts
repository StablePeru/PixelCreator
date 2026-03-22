import { PixelBuffer } from '../io/png-codec.js';

export class BufferPool {
  private static instance: BufferPool | null = null;
  private pools = new Map<string, PixelBuffer[]>();
  private allocated = 0;
  private reused = 0;

  static getInstance(): BufferPool {
    if (!BufferPool.instance) {
      BufferPool.instance = new BufferPool();
    }
    return BufferPool.instance;
  }

  static reset(): void {
    BufferPool.instance = null;
  }

  acquire(width: number, height: number): PixelBuffer {
    const key = `${width}x${height}`;
    const pool = this.pools.get(key);

    if (pool && pool.length > 0) {
      const buffer = pool.pop()!;
      buffer.clear();
      this.reused++;
      return buffer;
    }

    this.allocated++;
    return new PixelBuffer(width, height);
  }

  release(buffer: PixelBuffer): void {
    const key = `${buffer.width}x${buffer.height}`;
    const pool = this.pools.get(key) || [];
    if (pool.length < 16) { // Max 16 buffers per size
      pool.push(buffer);
      this.pools.set(key, pool);
    }
  }

  clear(): void {
    this.pools.clear();
    this.allocated = 0;
    this.reused = 0;
  }

  get stats(): { pooled: number; allocated: number; reused: number; sizes: string[] } {
    let pooled = 0;
    for (const pool of this.pools.values()) pooled += pool.length;
    return {
      pooled,
      allocated: this.allocated,
      reused: this.reused,
      sizes: [...this.pools.keys()],
    };
  }
}
