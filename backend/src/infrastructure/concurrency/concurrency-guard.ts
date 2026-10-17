import { getConfig } from '../../config/index.js';
import { getRedisClient, isRedisAvailable } from '../redis/connection.js';
import { createModuleLogger } from '../../shared/logger.js';

const log = createModuleLogger('concurrency-guard');

export interface LeaseContext {
  userId?: string;
  shareId?: string;
  apiKeyId?: string;
  accountId?: string;
}

export interface LeaseResult {
  allowed: boolean;
  retryAfterSeconds?: number;
  reason?: string;
  release: () => Promise<void>;
}

// In-memory fallback counters
const inMemoryCounters = new Map<string, number>();

function getInMemoryCount(key: string): number {
  return inMemoryCounters.get(key) || 0;
}

function incrInMemory(key: string): number {
  const current = getInMemoryCount(key);
  inMemoryCounters.set(key, current + 1);
  return current + 1;
}

function decrInMemory(key: string): void {
  const current = getInMemoryCount(key);
  if (current <= 1) {
    inMemoryCounters.delete(key);
  } else {
    inMemoryCounters.set(key, current - 1);
  }
}

export class ConcurrencyGuard {
  /**
   * Attempts to acquire concurrency slots for a download.
   * If any limit is exceeded, rolls back acquired slots and returns allowed: false with retry-after.
   */
  async acquireLease(ctx: LeaseContext): Promise<LeaseResult> {
    const config = getConfig();
    const redis = isRedisAvailable() ? getRedisClient() : null;
    const noopRelease = async () => {};

    const checks: { key: string; limit: number; label: string }[] = [];

    if (ctx.userId && ctx.userId !== 'anonymous') {
      checks.push({
        key: `concurrency:dl:user:${ctx.userId}`,
        limit: config.MAX_CONCURRENT_DOWNLOADS_PER_USER,
        label: `User (${ctx.userId})`,
      });
    }

    if (ctx.shareId) {
      checks.push({
        key: `concurrency:dl:share:${ctx.shareId}`,
        limit: config.MAX_CONCURRENT_DOWNLOADS_PER_SHARE,
        label: `Share Link (${ctx.shareId})`,
      });
    }

    if (ctx.apiKeyId) {
      checks.push({
        key: `concurrency:dl:apikey:${ctx.apiKeyId}`,
        limit: config.MAX_CONCURRENT_DOWNLOADS_PER_API_KEY,
        label: `API Key (${ctx.apiKeyId})`,
      });
    }

    if (ctx.accountId && ctx.accountId !== 'local_storage') {
      checks.push({
        key: `concurrency:dl:account:${ctx.accountId}`,
        limit: config.MAX_CONCURRENT_DOWNLOADS_PER_ACCOUNT,
        label: `Storage Account (${ctx.accountId})`,
      });
    }

    const acquiredKeys: string[] = [];

    try {
      for (const check of checks) {
        let count = 0;
        if (redis) {
          count = await redis.incr(check.key);
          // Set TTL so abnormal terminations auto-expire
          await redis.expire(check.key, 300);
        } else {
          count = incrInMemory(check.key);
        }
        acquiredKeys.push(check.key);

        if (count > check.limit) {
          log.warn(
            { key: check.key, count, limit: check.limit, label: check.label },
            'Download concurrency limit exceeded'
          );

          // Rollback all acquired keys
          await this.releaseKeys(acquiredKeys, redis);

          return {
            allowed: false,
            retryAfterSeconds: 5,
            reason: `Download concurrency limit exceeded for ${check.label}. Max allowed: ${check.limit}`,
            release: noopRelease,
          };
        }
      }

      let released = false;
      const release = async () => {
        if (released) return;
        released = true;
        await this.releaseKeys(acquiredKeys, redis);
      };

      return {
        allowed: true,
        release,
      };
    } catch (err) {
      log.error({ err }, 'Error checking download concurrency');
      // If error occurs during check, roll back and fail open or fail safe
      await this.releaseKeys(acquiredKeys, redis);
      return {
        allowed: true, // Degrade gracefully if Redis fails
        release: noopRelease,
      };
    }
  }

  private async releaseKeys(keys: string[], redis: any): Promise<void> {
    for (const key of keys) {
      try {
        if (redis) {
          const val = await redis.decr(key);
          if (val <= 0) {
            await redis.del(key);
          }
        } else {
          decrInMemory(key);
        }
      } catch (err) {
        log.warn({ err, key }, 'Failed to decrement concurrency key');
      }
    }
  }

  /**
   * Get current concurrency metrics
   */
  async getMetrics(): Promise<Record<string, number>> {
    const metrics: Record<string, number> = {};
    if (isRedisAvailable()) {
      const redis = getRedisClient();
      if (redis) {
        try {
          const keys = await redis.keys('concurrency:dl:*');
          for (const k of keys) {
            const v = await redis.get(k);
            metrics[k] = parseInt(v || '0', 10);
          }
          return metrics;
        } catch {}
      }
    }

    for (const [k, v] of inMemoryCounters.entries()) {
      metrics[k] = v;
    }
    return metrics;
  }
}

export const concurrencyGuard = new ConcurrencyGuard();
