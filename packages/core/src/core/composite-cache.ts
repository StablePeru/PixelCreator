import { PixelBuffer } from '../io/png-codec.js';

interface CacheEntry {
  buffer: PixelBuffer;
  accessTime: number;
}

export class CompositeCache {
  private static instance: CompositeCache | null = null;
  private cache = new Map<string, CacheEntry>();
  private maxEntries: number;
  private hits = 0;
  private misses = 0;

  constructor(maxEntries: number = 50) {
    this.maxEntries = maxEntries;
  }

  static getInstance(): CompositeCache {
    if (!CompositeCache.instance) {
      CompositeCache.instance = new CompositeCache();
    }
    return CompositeCache.instance;
  }

  static reset(): void {
    CompositeCache.instance = null;
  }

  makeKey(frameId: string, layerConfig: string): string {
    return `${frameId}:${layerConfig}`;
  }

  get(key: string): PixelBuffer | null {
    const entry = this.cache.get(key);
    if (entry) {
      entry.accessTime = Date.now();
      this.hits++;
      return entry.buffer.clone();
    }
    this.misses++;
    return null;
  }

  set(key: string, buffer: PixelBuffer): void {
    if (this.cache.size >= this.maxEntries) {
      this.evictLRU();
    }
    this.cache.set(key, { buffer: buffer.clone(), accessTime: Date.now() });
  }

  invalidate(frameId?: string): void {
    if (frameId) {
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${frameId}:`)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  private evictLRU(): void {
    let oldest: string | null = null;
    let oldestTime = Infinity;
    for (const [key, entry] of this.cache) {
      if (entry.accessTime < oldestTime) {
        oldestTime = entry.accessTime;
        oldest = key;
      }
    }
    if (oldest) this.cache.delete(oldest);
  }

  get stats(): { hits: number; misses: number; size: number; hitRate: string } {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate: total > 0 ? `${((this.hits / total) * 100).toFixed(1)}%` : '0%',
    };
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }
}
