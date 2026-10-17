import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { toNodeHandler } from 'better-auth/node';
import { getConfig } from './config/index.js';
import { getAuth } from './modules/auth/auth.js';
import { requestIdMiddleware } from './middleware/request-id.js';
import { errorHandler } from './middleware/error-handler.js';
import { authGuard } from './middleware/auth-guard.js';
import { adminGuard } from './middleware/admin-guard.js';
import { maintenanceGuard } from './middleware/maintenance-guard.js';
import { developerAuthGuard } from './middleware/developer-auth.js';
import { sendSuccess } from './shared/response.js';
import { checkMongoHealth } from './infrastructure/mongodb/connection.js';
import { checkRedisHealth } from './infrastructure/redis/connection.js';
import { createModuleLogger } from './shared/logger.js';

// Route modules
import { fileRouter } from './routes/file.routes.js';
import { folderRouter } from './routes/folder.routes.js';
import { uploadRouter } from './routes/upload.routes.js';
import { downloadRouter } from './routes/download.routes.js';
import { shareRouter } from './routes/share.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { developerRouter } from './routes/developer.routes.js';
import { developerApiRouter } from './routes/developer-api.routes.js';
import { publicRouter } from './routes/public.routes.js';
import { internalStreamRouter } from './routes/internal-stream.routes.js';
import { downloadMetrics } from './infrastructure/metrics/download-metrics.js';
import { metadataCache } from './infrastructure/cache/cache-manager.js';
import { transferScheduler } from './infrastructure/telegram/transfer-scheduler.js';
import { accountPool } from './infrastructure/telegram/pool.js';

const log = createModuleLogger('app');

export function createApp() {
  const app = express();
  const config = getConfig();

  // ── Security Headers ──────────────────────────────────────────────────
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  // ── Request ID ────────────────────────────────────────────────────────
  app.use(requestIdMiddleware);

  // ── CORS ──────────────────────────────────────────────────────────────
  const allowedOrigins = config.CORS_ORIGINS.split(',').map(s => s.trim());
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, public downloads)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      return callback(null, true); // Dev-friendly permissive CORS
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-API-Key', 'Range'],
    exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length', 'Content-Disposition'],
  }));

  // ── Better Auth — MUST be before express.json() ───────────────────────
  // Express v5 uses /*splat instead of /*
  const auth = getAuth();
  app.all('/api/auth/*splat', toNodeHandler(auth));

  // ── Body Parsing (after Better Auth handler) ──────────────────────────
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(cookieParser());

  // ── Public Routes (no auth required) ──────────────────────────────────
  app.use('/', publicRouter);

  // ── Trust Proxy ───────────────────────────────────────────────────────
  if (config.TRUST_PROXY === 'true') {
    app.set('trust proxy', 1);
  }

  // ── Health, Liveness, Readiness & Metrics ─────────────────────────────
  const livenessHandler = (_req: express.Request, res: express.Response) => {
    sendSuccess(res, { status: 'alive', uptime: process.uptime() });
  };
  app.get('/health', livenessHandler);
  app.get('/health/liveness', livenessHandler);

  const readinessHandler = async (_req: express.Request, res: express.Response) => {
    const [mongo, redis] = await Promise.all([
      checkMongoHealth(),
      checkRedisHealth(),
    ]);

    const healthyAccounts = accountPool.getHealthyClients();
    const isReady = mongo.status === 'healthy' && healthyAccounts.length > 0;
    const statusCode = isReady ? 200 : 503;

    res.status(statusCode).json({
      success: isReady,
      data: {
        status: isReady ? 'ready' : 'degraded',
        mongodb: mongo,
        redis: redis,
        telegramPool: {
          healthyAccountsCount: healthyAccounts.length,
          totalAccountsCount: accountPool.getAllClients().length,
        },
        uptime: process.uptime(),
      },
    });
  };
  app.get('/ready', readinessHandler);
  app.get('/health/readiness', readinessHandler);

  app.get('/health/metrics', (_req: express.Request, res: express.Response) => {
    const mem = process.memoryUsage();
    sendSuccess(res, {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        rssBytes: mem.rss,
        heapUsedBytes: mem.heapUsed,
        heapTotalBytes: mem.heapTotal,
        externalBytes: mem.external,
      },
      scheduler: transferScheduler.getMetrics(),
      cache: metadataCache.getMetrics(),
      download: downloadMetrics.getSnapshot(),
      storageAccounts: accountPool.getHealthReport(),
    });
  });

  // ── Web API Routes (authenticated with Better Auth session) ───────────
  app.get('/api/v1/me', authGuard, (req, res) => {
    sendSuccess(res, {
      user: req.authUser,
      session: req.authSession,
    });
  });

  // ── Maintenance Mode Guard ───────────────────────────────────────────
  app.use(maintenanceGuard);

  app.use('/api/v1/files', authGuard, fileRouter);
  app.use('/api/v1/folders', authGuard, folderRouter);
  app.use('/api/v1/upload', authGuard, uploadRouter);
  app.use('/api/v1/download', authGuard, downloadRouter);
  app.use('/api/v1/shares', authGuard, shareRouter);
  app.use('/api/v1/developer', authGuard, developerRouter);

  // ── Administration Control Plane (authenticated with Admin role) ──────
  app.use('/api/v1/admin', adminGuard, adminRouter);
  app.use('/api/admin', adminGuard, adminRouter);

  // ── Developer API (authenticated with API Key) ────────────────────────
  app.use('/developer/v1', developerAuthGuard, developerApiRouter);

  // ── Internal Controlled Streaming (for Cloudflare Worker Gateway) ──────
  app.use('/api/v1/internal', internalStreamRouter);

  // ── 404 catch-all ─────────────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Endpoint not found',
      },
    });
  });

  // ── Global Error Handler ──────────────────────────────────────────────
  app.use(errorHandler);

  log.info('Express app fully configured with all routes');
  return app;
}
