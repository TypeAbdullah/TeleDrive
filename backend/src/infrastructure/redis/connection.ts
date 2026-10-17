import { Redis } from 'ioredis';
import { createModuleLogger } from '../../shared/logger.js';
import { getConfig } from '../../config/index.js';

const log = createModuleLogger('redis');

let redisClient: Redis | null = null;
let isAvailable = false;

/**
 * Connect to Redis. Returns null if Redis URL is not configured
 * and REDIS_REQUIRED is false (single-instance dev mode).
 */
export async function connectRedis(): Promise<Redis | null> {
  const config = getConfig();

  if (!config.REDIS_URL) {
    if (config.REDIS_REQUIRED) {
      log.fatal('REDIS_URL is required but not configured');
      throw new Error('Redis is required but REDIS_URL is not set');
    }
    log.warn('Redis not configured — running in single-instance dev mode (no distributed coordination)');
    return null;
  }

  try {
    log.info('Connecting to Redis...');

    redisClient = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        if (times > 10) {
          log.error('Redis retry limit reached');
          return null; // Stop retrying
        }
        const delay = Math.min(times * 200, 5000);
        return delay;
      },
      reconnectOnError(err: Error) {
        const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
        return targetErrors.some(e => err.message.includes(e));
      },
      lazyConnect: true,
      enableReadyCheck: true,
    });

    redisClient.on('connect', () => {
      log.info('Redis connected');
    });

    redisClient.on('ready', () => {
      isAvailable = true;
      log.info('Redis ready');
    });

    redisClient.on('error', (err: any) => {
      isAvailable = false;
      log.error({ err }, 'Redis error');
    });

    redisClient.on('close', () => {
      isAvailable = false;
      log.warn('Redis connection closed');
    });

    redisClient.on('reconnecting', () => {
      log.info('Redis reconnecting...');
    });

    await redisClient.connect();

    return redisClient;

  } catch (err) {
    if (config.REDIS_REQUIRED) {
      log.fatal({ err }, 'Redis connection failed and REDIS_REQUIRED=true — exiting');
      throw err;
    }

    log.warn({ err }, 'Redis connection failed — degrading to single-instance mode');
    redisClient = null;
    return null;
  }
}

/**
 * Get the Redis client instance. Returns null if not connected.
 */
export function getRedisClient(): Redis | null {
  return redisClient;
}

/**
 * Check if Redis is currently available.
 */
export function isRedisAvailable(): boolean {
  return isAvailable && redisClient !== null;
}

/**
 * Gracefully disconnect Redis.
 */
export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    isAvailable = false;
    log.info('Redis disconnected gracefully');
  }
}

/**
 * Redis health check for readiness probes.
 */
export async function checkRedisHealth(): Promise<{
  status: 'healthy' | 'unhealthy' | 'not_configured';
  latencyMs: number;
}> {
  if (!redisClient) {
    return { status: 'not_configured', latencyMs: 0 };
  }

  const start = Date.now();
  try {
    await redisClient.ping();
    return { status: 'healthy', latencyMs: Date.now() - start };
  } catch {
    return { status: 'unhealthy', latencyMs: Date.now() - start };
  }
}
