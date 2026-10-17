import { Request, Response, NextFunction } from 'express';
import { getRedisClient, isRedisAvailable } from '../redis/connection.js';
import { createModuleLogger } from '../../shared/logger.js';
import { AppError } from '../../shared/errors.js';

const log = createModuleLogger('idempotency');

interface IdempotencyRecord {
  state: 'in-progress' | 'completed';
  statusCode?: number;
  body?: any;
  createdAt: number;
}

// In-memory fallback
const inMemoryRecords = new Map<string, IdempotencyRecord>();

/**
 * Middleware enforcing idempotent operations when Idempotency-Key header is supplied.
 */
export function idempotencyGuard(ttlSeconds = 86400) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = req.headers['idempotency-key'] as string | undefined;

    if (!key) {
      return next(); // Key not provided, proceed normally
    }

    // Validate key format
    if (!/^[a-zA-Z0-9_-]{8,128}$/.test(key)) {
      throw new AppError('Invalid Idempotency-Key header format', 400, 'INVALID_IDEMPOTENCY_KEY');
    }

    const userId = (req as any).authUser?.id || (req as any).apiKey?.userId || 'anonymous';
    const storageKey = `td:idemp:${userId}:${key}`;

    let record: IdempotencyRecord | null = null;

    if (isRedisAvailable()) {
      const redis = getRedisClient();
      if (redis) {
        try {
          const raw = await redis.get(storageKey);
          if (raw) record = JSON.parse(raw);
        } catch (err) {
          log.warn({ err, key }, 'Failed reading idempotency record from Redis');
        }
      }
    } else {
      const existing = inMemoryRecords.get(storageKey);
      if (existing && Date.now() - existing.createdAt < ttlSeconds * 1000) {
        record = existing;
      } else {
        inMemoryRecords.delete(storageKey);
      }
    }

    if (record) {
      if (record.state === 'in-progress') {
        res.status(409).json({
          success: false,
          error: {
            code: 'IDEMPOTENCY_CONFLICT',
            message: 'A request with this Idempotency-Key is currently in progress. Please retry shortly.',
          },
        });
        return;
      }

      if (record.state === 'completed') {
        log.info({ key, userId }, 'Returning cached idempotent response');
        res.setHeader('X-Idempotent-Replay', 'true');
        res.status(record.statusCode || 200).json(record.body);
        return;
      }
    }

    // Mark as in-progress
    const inProgressRecord: IdempotencyRecord = {
      state: 'in-progress',
      createdAt: Date.now(),
    };

    if (isRedisAvailable()) {
      const redis = getRedisClient();
      if (redis) {
        await redis.setex(storageKey, 120, JSON.stringify(inProgressRecord)).catch(() => {});
      }
    } else {
      inMemoryRecords.set(storageKey, inProgressRecord);
    }

    // Intercept res.send/res.json to record completed payload
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const completedRecord: IdempotencyRecord = {
          state: 'completed',
          statusCode: res.statusCode,
          body,
          createdAt: Date.now(),
        };

        if (isRedisAvailable()) {
          const redis = getRedisClient();
          if (redis) {
            redis.setex(storageKey, ttlSeconds, JSON.stringify(completedRecord)).catch(() => {});
          }
        } else {
          inMemoryRecords.set(storageKey, completedRecord);
        }
      } else {
        // Clear in-progress record on failure so caller can retry
        if (isRedisAvailable()) {
          const redis = getRedisClient();
          if (redis) redis.del(storageKey).catch(() => {});
        } else {
          inMemoryRecords.delete(storageKey);
        }
      }
      return originalJson(body);
    };

    next();
  };
}
