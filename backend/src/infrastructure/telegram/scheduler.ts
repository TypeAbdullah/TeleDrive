import { accountPool } from './pool.js';
import { ITelegramClientAdapter } from './client.js';

export class StorageScheduler {
  /**
   * Select the most optimal account for uploading a file chunk.
   * Uses weighted health, load, latency, and throughput scoring.
   */
  async selectForUpload(): Promise<ITelegramClientAdapter> {
    return accountPool.getBestClient('upload');
  }

  /**
   * Select the most optimal account for downloading.
   */
  async selectForDownload(accountId?: string): Promise<ITelegramClientAdapter> {
    return accountPool.getClient(accountId);
  }

  trackUploadStart(accountId: string): void {
    accountPool.recordOperationStart(accountId, 'upload');
  }

  trackUploadEnd(accountId: string): void {
    accountPool.recordOperationEnd(accountId, 'upload');
  }

  trackDownloadStart(accountId: string): void {
    accountPool.recordOperationStart(accountId, 'download');
  }

  trackDownloadEnd(accountId: string): void {
    accountPool.recordOperationEnd(accountId, 'download');
  }

  getMetrics() {
    return accountPool.getHealthReport().map(stat => ({
      accountId: stat.accountId,
      label: stat.label,
      isReady: stat.status === 'active' || stat.status === 'cooldown',
      status: stat.status,
      score: stat.score,
      circuitBreaker: stat.circuitBreaker,
      inFlightUploads: stat.activeUploads,
      inFlightDownloads: stat.activeDownloads,
      avgLatencyMs: stat.avgLatencyMs,
      throughputBytesPerSec: stat.throughputBytesPerSec,
    }));
  }
}

export const scheduler = new StorageScheduler();
