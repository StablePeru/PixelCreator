import * as crypto from 'node:crypto';

interface CacheEntry {
  png: Buffer;
  etag: string;
}

export class FrameCache {
  private cache = new Map<string, CacheEntry>();
  private order: string[] = [];
  private maxSize: number;

  constructor(maxSize = 50) {
    this.maxSize = maxSize;
  }

  private key(canvas: string, frame: number, scale: number): string {
    return `${canvas}:${frame}:${scale}`;
  }

  get(canvas: string, frame: number, scale: number): CacheEntry | null {
    return this.cache.get(this.key(canvas, frame, scale)) ?? null;
  }

  set(canvas: string, frame: number, scale: number, png: Buffer): string {
    const k = this.key(canvas, frame, scale);
    const etag = `"${crypto.createHash('md5').update(png).digest('hex').slice(0, 16)}"`;

    this.cache.set(k, { png, etag });
    this.order.push(k);

    // Evict oldest
    while (this.cache.size > this.maxSize) {
      const oldest = this.order.shift();
      if (oldest) this.cache.delete(oldest);
    }

    return etag;
  }

  invalidate(canvas: string): void {
    const prefix = `${canvas}:`;
    for (const [key] of this.cache) {
      if (key.startsWith(prefix)) this.cache.delete(key);
    }
    this.order = this.order.filter((k) => !k.startsWith(prefix));
  }

  clear(): void {
    this.cache.clear();
    this.order.length = 0;
  }

  get size(): number {
    return this.cache.size;
  }
}
