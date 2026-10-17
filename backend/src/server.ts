import { loadConfig } from './config/index.js';
import { logger, createModuleLogger } from './shared/logger.js';
import { connectMongoDB, disconnectMongoDB } from './infrastructure/mongodb/connection.js';
import { connectRedis, disconnectRedis } from './infrastructure/redis/connection.js';
import { initAuth } from './modules/auth/auth.js';
import { accountPool } from './infrastructure/telegram/pool.js';
import { transferScheduler } from './infrastructure/telegram/transfer-scheduler.js';
import { reconciliationService } from './services/reconciliation.service.js';
import { settingsService } from './services/settings.service.js';
import { discordAllowlistService } from './services/discord-allowlist.service.js';
import { createApp } from './app.js';

const log = createModuleLogger('server');

async function main() {
  // ── 1. Validate environment ──────────────────────────────────────────
  const config = loadConfig();
  log.info({ env: config.NODE_ENV, port: config.PORT }, 'TeleDrive server starting...');

  // ── 2. Connect to MongoDB Atlas ──────────────────────────────────────
  await connectMongoDB();

  // Initialize runtime settings catalog in MongoDB
  await settingsService.initialize();

  // Load allowed Discord usernames whitelist
  await discordAllowlistService.loadCache();

  // ── 3. Connect to Redis (optional) ───────────────────────────────────
  await connectRedis();

  // ── 4. Initialize Better Auth (after Mongoose connects) ──────────────
  initAuth();

  // ── 5. Initialize Telegram Account Pool ──────────────────────────────
  await accountPool.initialize();

  // ── 6. Start Reconciliation Service ──────────────────────────────────
  reconciliationService.startScheduledReconciliation();

  // ── 7. Create and start Express app ──────────────────────────────────
  const app = createApp();

  const server = app.listen(config.PORT, () => {
    log.info(`TeleDrive backend listening on http://localhost:${config.PORT}`);
    log.info(`Health: http://localhost:${config.PORT}/health`);
    log.info(`Ready:  http://localhost:${config.PORT}/ready`);
    log.info(`Auth:   http://localhost:${config.PORT}/api/auth/ok`);
  });

  // ── Graceful Shutdown ────────────────────────────────────────────────
  let isShuttingDown = false;
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    log.info({ signal }, 'Graceful shutdown initiated');

    // Stop accepting new connections
    server.close(async () => {
      log.info('HTTP server stopped accepting new connections');

      try {
        // Drain in-flight transfers cleanly with a 15-second deadline
        await transferScheduler.drain(15000);
        reconciliationService.stop();
        await accountPool.shutdown();
        await disconnectRedis();
        await disconnectMongoDB();
        log.info('All resources cleanly closed — exiting process');
        process.exit(0);
      } catch (err) {
        log.error({ err }, 'Error during shutdown');
        process.exit(1);
      }
    });

    // Hard cutoff if graceful shutdown hangs
    setTimeout(() => {
      log.error('Graceful shutdown timed out (30s) — forcing exit');
      process.exit(1);
    }, 30000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Unhandled rejection / exception safety net
  process.on('unhandledRejection', (reason) => {
    log.error({ reason }, 'Unhandled Promise rejection');
  });

  process.on('uncaughtException', (err) => {
    log.fatal({ err }, 'Uncaught exception — exiting');
    process.exit(1);
  });
}

main().catch((err) => {
  logger.fatal({ err }, 'Fatal startup error');
  process.exit(1);
});
