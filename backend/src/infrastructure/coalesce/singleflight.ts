import crypto from 'crypto';
import { getRedisClient, isRedisAvailable } from '../redis/connection.js';
import { createModuleLogger } from '../../shared/logger.js';

const log = createModuleLogger('singleflight');

interface InFlightCall<T> {
  promise: Promise<T>;
  subscribers: number;
}

/**
 * Singleflight request coalescing group.
 * Ensures that for any given key, only one execution of an expensive async
 * operation is in flight at a time. All concurrent callers share the identical result.
 */
export class SingleFlightGroup {
  private inFlight = new Map<string, InFlightCall<any>>();

  async execute<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = this.inFlight.get(key);
    if (existing) {
      existing.subscribers++;
      log.debug({ key, subscribers: existing.subscribers }, 'Coalescing concurrent request into in-flight execution');
      return existing.promise as Promise<T>;
    }

    const call: InFlightCall<T> = {
      promise: (async () => {
        try {
          return await fn();
        } finally {
          this.inFlight.delete(key);
        }
      })(),
      subscribers: 1,
    };

    this.inFlight.set(key, call);
    return call.promise;
  }

  get activeKeysCount(): number {
    return this.inFlight.size;
  }
}

export const metadataSingleFlight = new SingleFlightGroup();

/**
 * Distributed Lock interface
 */
export interface LockHandle {
  lockId: string;
  resourceKey: string;
  release: () => Promise<boolean>;
}

// In-memory fallback lock map for single-instance mode
const inMemoryLocks = new Map<string, { lockId: string; expiresAt: number }>();

const RELEASE_LOCK_LUA = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

/**
 * Acquires a distributed lock with auto-expiration and ownership token.
 * Uses Redis when configured; falls back safely to in-memory mutex in single-instance mode.
 */
export async function acquireLock(resourceKey: string, ttlMs = 10_000): Promise<LockHandle | null> {
  const lockId = crypto.randomUUID();
  const fullKey = `td:lock:${resourceKey}`;

  if (isRedisAvailable()) {
    const redis = getRedisClient();
    if (redis) {
      try {
        // Set NX PX
        const acquired = await redis.set(fullKey, lockId, 'PX', ttlMs, 'NX');
        if (!acquired) {
          return null; // Lock already held
        }

        return {
          lockId,
          resourceKey,
          release: async () => {
            try {
              const res = await redis.eval(RELEASE_LOCK_LUA, 1, fullKey, lockId);
              return res === 1;
            } catch (err) {
              log.warn({ err, resourceKey }, 'Error releasing Redis distributed lock');
              return false;
            }
          },
        };
      } catch (err) {
        log.warn({ err, resourceKey }, 'Failed to acquire Redis lock; falling back to in-memory');
      }
    }
  }

  // In-memory fallback
  const now = Date.now();
  const existing = inMemoryLocks.get(fullKey);
  if (existing && existing.expiresAt > now) {
    return null; // Locked
  }

  inMemoryLocks.set(fullKey, { lockId, expiresAt: now + ttlMs });
  return {
    lockId,
    resourceKey,
    release: async () => {
      const current = inMemoryLocks.get(fullKey);
      if (current && current.lockId === lockId) {
        inMemoryLocks.delete(fullKey);
        return true;
      }
      return false;
    },
  };
}
