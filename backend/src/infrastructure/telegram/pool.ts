import mongoose from 'mongoose';
import { StorageAccount, IStorageAccount } from '../../models/StorageAccount.js';
import { ITelegramClientAdapter, MtcuteClientAdapter, LocalStorageAdapter } from './client.js';
import { decrypt } from '../../shared/crypto.js';
import { createModuleLogger } from '../../shared/logger.js';
import { getConfig } from '../../config/index.js';
import { sessionHealth, SessionHealthTracker } from './session-health.js';
import { SessionHealthStats } from './session-types.js';

const log = createModuleLogger('telegram-pool');

class TelegramAccountPool {
  private clients: Map<string, ITelegramClientAdapter> = new Map();
  private localFallback = new LocalStorageAdapter();
  private isInitialized = false;
  private healthInterval?: NodeJS.Timeout;
  private reconnectingAccounts: Set<string> = new Set();

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    log.info('Initializing production Telegram account pool...');

    await this.localFallback.connect();
    this.clients.set(this.localFallback.accountId, this.localFallback);
    sessionHealth.registerSession(this.localFallback.accountId, this.localFallback.label);

    await this.syncAccountsFromDB();

    // Start background health checking & cooldown evaluation loop (every 15s)
    this.healthInterval = setInterval(() => {
      this.evaluateAllAccounts();
    }, 15_000);
    this.healthInterval.unref();

    this.isInitialized = true;
  }

  async syncAccountsFromDB(): Promise<void> {
    if (mongoose.connection.readyState !== 1) {
      log.debug('Mongoose not connected — skipping account sync from DB');
      return;
    }

    try {
      const config = getConfig();
      const accounts = await StorageAccount.find({ status: { $ne: 'disabled' } });

      log.info({ count: accounts.length }, 'Discovered storage accounts in DB');

      for (const acc of accounts) {
        if (this.clients.has(acc._id.toString())) {
          continue;
        }

        await this.addAccountToPool(acc, config);
      }
    } catch (err) {
      log.error({ err }, 'Error syncing storage accounts from DB');
    }
  }

  async addAccountToPool(acc: IStorageAccount, config = getConfig()): Promise<boolean> {
    const accountId = acc._id.toString();
    const apiId = acc.apiId || Number(config.TELEGRAM_API_ID) || 0;
    const apiHash = acc.apiHash || config.TELEGRAM_API_HASH || '';

    if (!apiId || !apiHash) {
      log.warn({ accountId, label: acc.label }, 'Missing apiId or apiHash for account; skipping');
      return false;
    }

    let botToken = acc.botToken;
    if (botToken && botToken.includes(':') && botToken.length > 60) {
      try {
        botToken = decrypt(botToken);
      } catch {
        // Keep raw token if decryption fails or if unencrypted in test
      }
    }

    const client = new MtcuteClientAdapter({
      accountId,
      label: acc.label,
      apiId,
      apiHash,
      botToken,
      peerId: acc.storagePeerId || 'me',
    });

    sessionHealth.registerSession(accountId, acc.label);

    try {
      await client.connect();
      this.clients.set(accountId, client);
      log.info({ accountId, label: acc.label }, 'Added storage account to active pool');
      return true;
    } catch (err) {
      log.error({ err, accountId }, 'Failed to start account MTProto client');
      sessionHealth.recordFailure(accountId, err);
      await StorageAccount.findByIdAndUpdate(acc._id, {
        status: 'error',
        $inc: { errorCount: 1 },
      }).catch(() => {});
      return false;
    }
  }

  async removeAccountFromPool(accountId: string): Promise<void> {
    const client = this.clients.get(accountId);
    if (client && client.accountId !== this.localFallback.accountId) {
      await client.disconnect().catch(() => {});
      this.clients.delete(accountId);
      sessionHealth.unregisterSession(accountId);
      log.info({ accountId }, 'Removed account from storage pool');
    }
  }

  /**
   * Retrieves a specific client by ID or falls back to best healthy candidate
   */
  getClient(accountId?: string): ITelegramClientAdapter {
    if (accountId && this.clients.has(accountId)) {
      const client = this.clients.get(accountId)!;
      if (client.isReady) {
        return client;
      }
    }
    return this.getBestClient('download');
  }

  /**
   * Selects the optimal account using weighted health and workload scoring
   */
  getBestClient(operation: 'upload' | 'download' = 'download'): ITelegramClientAdapter {
    const candidates = Array.from(this.clients.values()).filter(c => c.isReady);

    if (candidates.length === 0) {
      return this.localFallback;
    }

    // Separate real Telegram clients from local fallback
    const telegramCandidates = candidates.filter(c => c.accountId !== this.localFallback.accountId);
    const pool = telegramCandidates.length > 0 ? telegramCandidates : candidates;

    let bestClient: ITelegramClientAdapter = pool[0];
    let highestScore = -1;

    for (const client of pool) {
      const stats = sessionHealth.getStats(client.accountId);
      const score = stats ? stats.score : 50;

      // Ensure account is not maxed out
      if (stats) {
        if (operation === 'upload' && stats.activeUploads >= 5) continue;
        if (operation === 'download' && stats.activeDownloads >= 15) continue;
      }

      if (score > highestScore) {
        highestScore = score;
        bestClient = client;
      }
    }

    return bestClient;
  }

  getAllClients(): ITelegramClientAdapter[] {
    return Array.from(this.clients.values());
  }

  getHealthyClients(): ITelegramClientAdapter[] {
    const list = Array.from(this.clients.values()).filter(c => {
      if (!c.isReady) return false;
      const stats = sessionHealth.getStats(c.accountId);
      return stats ? stats.score > 0 : true;
    });

    return list.length > 0 ? list : [this.localFallback];
  }

  recordOperationStart(accountId: string, type: 'upload' | 'download'): void {
    sessionHealth.recordOperationStart(accountId, type);
  }

  recordOperationEnd(accountId: string, type: 'upload' | 'download'): void {
    sessionHealth.recordOperationEnd(accountId, type);
  }

  async recordSuccess(accountId: string, bytes: number, durationMs = 50): Promise<void> {
    sessionHealth.recordSuccess(accountId, durationMs, bytes);

    if (accountId === this.localFallback.accountId) return;

    try {
      await StorageAccount.findByIdAndUpdate(accountId, {
        lastSuccessfulOp: new Date(),
        status: 'active',
        $inc: { totalBytesStored: bytes },
      });
    } catch (err) {
      log.warn({ err, accountId }, 'Failed to persist account success stats');
    }
  }

  async recordError(accountId: string, err: unknown, durationMs = 50): Promise<void> {
    sessionHealth.recordFailure(accountId, err, durationMs);

    if (accountId === this.localFallback.accountId) return;

    log.warn({ err, accountId }, 'Recorded error for storage account');

    const update: any = {
      $inc: { errorCount: 1 },
    };

    const stats = sessionHealth.getStats(accountId);
    if (stats?.status === 'cooldown' && stats.floodWaitUntil) {
      update.status = 'cooldown';
      update.floodWaitUntil = stats.floodWaitUntil;
    } else if (stats?.circuitBreaker === 'open') {
      update.status = 'error';
    }

    try {
      await StorageAccount.findByIdAndUpdate(accountId, update);
    } catch {}
  }

  private evaluateAllAccounts(): void {
    const allStats = sessionHealth.getAllStats();
    for (const stat of allStats) {
      if (stat.accountId === this.localFallback.accountId) continue;

      // If circuit breaker is half-open or status returned to active from cooldown, attempt reconnect if not ready
      const client = this.clients.get(stat.accountId);
      if (client && !client.isReady && stat.status === 'active' && !this.reconnectingAccounts.has(stat.accountId)) {
        this.attemptReconnect(stat.accountId, client);
      }
    }
  }

  private async attemptReconnect(accountId: string, client: ITelegramClientAdapter): Promise<void> {
    this.reconnectingAccounts.add(accountId);
    const delay = SessionHealthTracker.getReconnectDelay(1, 1000, 10000);

    setTimeout(async () => {
      try {
        log.info({ accountId, label: client.label }, 'Attempting MTProto reconnect with jittered backoff');
        await client.connect();
        log.info({ accountId }, 'MTProto client reconnected successfully');
      } catch (err) {
        log.warn({ err, accountId }, 'MTProto reconnect attempt failed');
        sessionHealth.recordFailure(accountId, err);
      } finally {
        this.reconnectingAccounts.delete(accountId);
      }
    }, delay);
  }

  /**
   * Safe operational health inspection — strictly strips all tokens, sessions, and keys
   */
  getHealthReport(): SessionHealthStats[] {
    return sessionHealth.getAllStats();
  }

  async shutdown(): Promise<void> {
    log.info('Shutting down Telegram account pool...');
    if (this.healthInterval) {
      clearInterval(this.healthInterval);
    }
    for (const client of this.clients.values()) {
      await client.disconnect().catch(() => {});
    }
    this.clients.clear();
  }
}

export const accountPool = new TelegramAccountPool();
