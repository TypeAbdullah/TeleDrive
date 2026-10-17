import mongoose from 'mongoose';
import { createModuleLogger } from '../../shared/logger.js';
import { getConfig } from '../../config/index.js';

const log = createModuleLogger('mongodb');

let isConnected = false;

/**
 * Connect to MongoDB Atlas via Mongoose using an SRV connection string.
 * Retries with backoff on initial failure.
 */
export async function connectMongoDB(): Promise<typeof mongoose> {
  const config = getConfig();

  if (isConnected && mongoose.connection.readyState === 1) {
    log.debug('MongoDB already connected');
    return mongoose;
  }

  const maxRetries = 5;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      log.info({ attempt: retries + 1 }, 'Connecting to MongoDB Atlas...');

      await mongoose.connect(config.MONGODB_URI, {
        dbName: config.MONGODB_DB_NAME,
        maxPoolSize: 10,
        minPoolSize: 2,
        socketTimeoutMS: 45000,
        serverSelectionTimeoutMS: 10000,
        heartbeatFrequencyMS: 10000,
        retryWrites: true,
        retryReads: true,
      });

      isConnected = true;
      log.info('MongoDB Atlas connected successfully');

      // Connection event listeners
      mongoose.connection.on('disconnected', () => {
        isConnected = false;
        log.warn('MongoDB disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        isConnected = true;
        log.info('MongoDB reconnected');
      });

      mongoose.connection.on('error', (err) => {
        log.error({ err }, 'MongoDB connection error');
      });

      return mongoose;

    } catch (err) {
      retries++;
      const backoffMs = Math.min(1000 * Math.pow(2, retries), 30000);
      log.error({ err, attempt: retries, nextRetryMs: backoffMs }, 'MongoDB connection failed');

      if (retries >= maxRetries) {
        log.fatal('MongoDB connection failed after maximum retries — exiting');
        throw err;
      }

      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }

  throw new Error('MongoDB connection failed — unreachable');
}

/**
 * Gracefully close the MongoDB connection.
 */
export async function disconnectMongoDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    log.info('MongoDB disconnected gracefully');
  }
}

/**
 * Check MongoDB health for readiness probes.
 */
export async function checkMongoHealth(): Promise<{
  status: 'healthy' | 'unhealthy';
  latencyMs: number;
}> {
  const start = Date.now();
  try {
    if (mongoose.connection.readyState !== 1) {
      return { status: 'unhealthy', latencyMs: Date.now() - start };
    }

    const db = mongoose.connection.db;
    if (!db) {
      return { status: 'unhealthy', latencyMs: Date.now() - start };
    }

    await db.admin().ping();
    return { status: 'healthy', latencyMs: Date.now() - start };
  } catch {
    return { status: 'unhealthy', latencyMs: Date.now() - start };
  }
}

/**
 * Get the underlying Mongoose connection for use with Better Auth adapter.
 */
export function getMongooseConnection(): mongoose.Connection {
  return mongoose.connection;
}
