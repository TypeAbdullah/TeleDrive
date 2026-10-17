import fs from 'fs';
import path from 'path';
import { UploadJob } from '../models/UploadJob.js';
import { createModuleLogger } from '../shared/logger.js';

const log = createModuleLogger('reconciliation');

export class ReconciliationService {
  private timer?: NodeJS.Timeout;

  startScheduledReconciliation(intervalMs = 3600_000): void {
    // Run once on startup after 5 seconds
    setTimeout(() => {
      this.reconcileStaleUploads().catch(err => {
        log.error({ err }, 'Error during initial upload reconciliation');
      });
      this.cleanupOrphanedTempFiles().catch(err => {
        log.error({ err }, 'Error during initial temp file cleanup');
      });
    }, 5000);

    this.timer = setInterval(() => {
      this.reconcileStaleUploads().catch(err => {
        log.error({ err }, 'Error during scheduled upload reconciliation');
      });
      this.cleanupOrphanedTempFiles().catch(err => {
        log.error({ err }, 'Error during scheduled temp file cleanup');
      });
    }, intervalMs);
    this.timer.unref();
  }

  /**
   * Identifies pending/uploading UploadJobs older than 24 hours and marks them failed.
   */
  async reconcileStaleUploads(): Promise<number> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await UploadJob.updateMany(
      {
        status: { $in: ['pending', 'uploading', 'assembling'] },
        updatedAt: { $lt: cutoff },
      },
      {
        $set: {
          status: 'failed',
          error: 'Upload session timed out after 24 hours of inactivity',
        },
      }
    );

    if (result.modifiedCount > 0) {
      log.info({ modifiedCount: result.modifiedCount }, 'Reconciled stale upload sessions');
    }
    return result.modifiedCount;
  }

  /**
   * Cleans up orphaned files in .temp_uploads that are older than 2 hours.
   */
  async cleanupOrphanedTempFiles(): Promise<number> {
    const tempDir = path.resolve(process.cwd(), '.temp_uploads');
    if (!fs.existsSync(tempDir)) return 0;

    let cleaned = 0;
    const now = Date.now();
    const twoHoursAgo = now - 2 * 60 * 60 * 1000;

    try {
      const files = await fs.promises.readdir(tempDir);
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        try {
          const stats = await fs.promises.stat(filePath);
          if (stats.mtimeMs < twoHoursAgo) {
            await fs.promises.unlink(filePath);
            cleaned++;
          }
        } catch {}
      }
    } catch (err: any) {
      log.warn({ err: err?.message }, 'Failed reading temp directory during cleanup');
    }

    if (cleaned > 0) {
      log.info({ cleanedFiles: cleaned }, 'Cleaned up orphaned temp upload files');
    }
    return cleaned;
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }
}

export const reconciliationService = new ReconciliationService();
