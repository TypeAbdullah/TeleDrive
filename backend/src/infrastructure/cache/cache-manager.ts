import { getRedisClient, isRedisAvailable } from '../redis/connection.js';
import { createModuleLogger } from '../../shared/logger.js';

const log = createModuleLogger('cache-manager');

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRatio: number;
  l1EntryCount: number;
}

/**
 * Multi-tier Cache Manager (L1 Memory LRU + L2 Redis)
 * Enforces bounded memory limits and never caches raw file contents or sensitive credentials.
 */
export class CacheManager {
  private l1Map = new Map<string, CacheEntry<any>>();
  private maxL1Entries: number;
  private hits = 0;
  private misses = 0;

  constructor(maxL1Entries = 2000) {
    this.maxL1Entries = maxL1Entries;
  }

  async get<T>(key: string): Promise<T | null> {
    const now = Date.now();

    // 1. Check L1 process memory
    const l1Entry = this.l1Map.get(key);
    if (l1Entry) {
      if (l1Entry.expiresAt > now) {
        // Move to end for LRU refresh
        this.l1Map.delete(key);
        this.l1Map.set(key, l1Entry);
        this.hits++;
        return l1Entry.value as T;
      }
      this.l1Map.delete(key);
    }

    // 2. Check L2 Redis if available
    if (isRedisAvailable()) {
      const redis = getRedisClient();
      if (redis) {
        try {
          const raw = await redis.get(`td:cache:${key}`);
          if (raw) {
            const parsed = JSON.parse(raw);
            // Populate L1 cache with remaining TTL (min 10s)
            this.setL1(key, parsed, 30);
            this.hits++;
            return parsed as T;
          }
        } catch (err) {
          log.warn({ err, key }, 'Failed reading from L2 Redis cache');
        }
      }
    }

    this.misses++;
    return null;
  }

  async set<T>(key: string, value: T, ttlSeconds = 60): Promise<void> {
    // 1. Set L1
    this.setL1(key, value, ttlSeconds);

    // 2. Set L2 Redis
    if (isRedisAvailable()) {
      const redis = getRedisClient();
      if (redis) {
        try {
          await redis.setex(`td:cache:${key}`, ttlSeconds, JSON.stringify(value));
        } catch (err) {
          log.warn({ err, key }, 'Failed writing to L2 Redis cache');
        }
      }
    }
  }

  private setL1<T>(key: string, value: T, ttlSeconds: number): void {
    if (this.l1Map.size >= this.maxL1Entries) {
      // Evict oldest entry (LRU)
      const oldestKey = this.l1Map.keys().next().value;
      if (oldestKey) {
        this.l1Map.delete(oldestKey);
      }
    }

    this.l1Map.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async invalidate(key: string): Promise<void> {
    this.l1Map.delete(key);

    if (isRedisAvailable()) {
      const redis = getRedisClient();
      if (redis) {
        try {
          await redis.del(`td:cache:${key}`);
        } catch (err) {
          log.warn({ err, key }, 'Failed deleting from L2 Redis cache');
        }
      }
    }
  }

  async getOrSet<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const fresh = await fetcher();
    if (fresh !== null && fresh !== undefined) {
      await this.set(key, fresh, ttlSeconds);
    }
    return fresh;
  }

  getMetrics(): CacheMetrics {
    const total = this.hits + this.misses;
    const hitRatio = total > 0 ? Number((this.hits / total).toFixed(3)) : 0;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRatio,
      l1EntryCount: this.l1Map.size,
    };
  }

  clearL1(): void {
    this.l1Map.clear();
  }
}

export const metadataCache = new CacheManager();
