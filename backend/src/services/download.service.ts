import { Request, Response } from 'express';
import { IFile } from '../models/File.js';
import { accountPool } from '../infrastructure/telegram/pool.js';
import { scheduler } from '../infrastructure/telegram/scheduler.js';
import { concurrencyGuard } from '../infrastructure/concurrency/concurrency-guard.js';
import { downloadMetrics } from '../infrastructure/metrics/download-metrics.js';
import { NotFoundError } from '../shared/errors.js';
import { createModuleLogger } from '../shared/logger.js';

const log = createModuleLogger('download-service');

export interface StreamFileOptions {
  rangeHeader?: string;
  isHead?: boolean;
  userId?: string;
  shareId?: string;
  apiKeyId?: string;
  dispositionType?: 'inline' | 'attachment';
  cachePolicy?: 'public' | 'private' | 'revocable';
}

export interface ParsedRange {
  start: number;
  end: number;
  chunkSize: number;
}

export function parseHttpRange(rangeHeader: string, fileSize: number): {
  valid: boolean;
  range?: ParsedRange;
  isRange: boolean;
  error?: string;
} {
  if (!rangeHeader) {
    return { valid: true, isRange: false };
  }

  if (!rangeHeader.startsWith('bytes=')) {
    return { valid: false, isRange: true, error: 'Malformed range header' };
  }

  const rangeSpec = rangeHeader.replace(/^bytes=/, '').trim();
  if (rangeSpec.includes(',')) {
    return { valid: false, isRange: true, error: 'Multiple ranges not supported' };
  }

  const parts = rangeSpec.split('-');
  if (parts.length !== 2) {
    return { valid: false, isRange: true, error: 'Invalid range syntax' };
  }

  const startStr = parts[0].trim();
  const endStr = parts[1].trim();

  let start: number;
  let end: number;

  if (startStr === '' && endStr !== '') {
    // Suffix range: bytes=-500 (last 500 bytes)
    const suffix = parseInt(endStr, 10);
    if (isNaN(suffix) || suffix <= 0) {
      return { valid: false, isRange: true, error: 'Invalid suffix range length' };
    }
    start = Math.max(0, fileSize - suffix);
    end = fileSize - 1;
  } else if (startStr !== '' && endStr === '') {
    // Open range: bytes=500- (from 500 to EOF)
    start = parseInt(startStr, 10);
    end = fileSize - 1;
  } else if (startStr !== '' && endStr !== '') {
    start = parseInt(startStr, 10);
    end = parseInt(endStr, 10);
  } else {
    return { valid: false, isRange: true, error: 'Empty range' };
  }

  if (isNaN(start) || isNaN(end) || start < 0 || end >= fileSize || start > end) {
    return { valid: false, isRange: true, error: 'Range Not Satisfiable' };
  }

  return {
    valid: true,
    isRange: true,
    range: {
      start,
      end,
      chunkSize: end - start + 1,
    },
  };
}

export function formatContentDisposition(filename: string, dispositionType: 'inline' | 'attachment' = 'inline'): string {
  const safeAscii = filename
    .replace(/[\r\n\0]/g, '')
    .replace(/[\\"]/g, '_')
    .replace(/[^\x20-\x7E]/g, '_');

  const encodedRfc5987 = encodeURIComponent(filename).replace(/['()]/g, escape);
  return `${dispositionType}; filename="${safeAscii}"; filename*=UTF-8''${encodedRfc5987}`;
}

export class DownloadService {
  /**
   * Streams a file with bounded memory, full HTTP Range support, client cancellation handling,
   * safe Content-Disposition, and distributed concurrency protection.
   */
  async streamFile(file: IFile, req: Request, res: Response, options: StreamFileOptions = {}): Promise<void> {
    if (!file.storageRef) {
      throw new NotFoundError('File storage reference');
    }

    const { accountId, messageId, fileId, chunks } = file.storageRef;
    const client = accountPool.getClient(accountId);
    const isHead = options.isHead || req.method === 'HEAD';
    const rangeHeader = options.rangeHeader ?? req.headers.range;

    // Range Parsing & Validation
    const rangeResult = parseHttpRange(rangeHeader || '', file.size);

    if (!rangeResult.valid && rangeResult.isRange) {
      res.status(416);
      res.setHeader('Content-Range', `bytes */${file.size}`);
      res.setHeader('Accept-Ranges', 'bytes');
      res.json({
        success: false,
        error: {
          code: 'RANGE_NOT_SATISFIABLE',
          message: rangeResult.error || 'Requested Range Not Satisfiable',
        },
      });
      return;
    }

    // Set Common Headers
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader(
      'Content-Disposition',
      formatContentDisposition(file.name, options.dispositionType || 'inline')
    );

    // Cache-Control headers
    if (options.cachePolicy === 'public') {
      res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, immutable');
    } else {
      res.setHeader('Cache-Control', 'private, no-store');
    }

    let is206 = false;
    let rangeStart = 0;
    let rangeEnd = file.size - 1;
    let contentLength = file.size;

    if (rangeResult.isRange && rangeResult.range) {
      is206 = true;
      rangeStart = rangeResult.range.start;
      rangeEnd = rangeResult.range.end;
      contentLength = rangeResult.range.chunkSize;

      res.status(206);
      res.setHeader('Content-Range', `bytes ${rangeStart}-${rangeEnd}/${file.size}`);
      res.setHeader('Content-Length', contentLength);
    } else {
      res.status(200);
      res.setHeader('Content-Length', contentLength);
    }

    // HEAD Request handling: return immediately without reading storage
    if (isHead) {
      res.end();
      return;
    }

    // Acquire Concurrency Lease
    const lease = await concurrencyGuard.acquireLease({
      userId: options.userId || file.userId,
      shareId: options.shareId,
      apiKeyId: options.apiKeyId,
      accountId: client.accountId,
    });

    if (!lease.allowed) {
      res.status(429);
      if (lease.retryAfterSeconds) {
        res.setHeader('Retry-After', lease.retryAfterSeconds);
      }
      res.json({
        success: false,
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: lease.reason || 'Concurrent download limit reached. Please retry shortly.',
        },
      });
      return;
    }

    // Track active scheduler & telemetry
    scheduler.trackDownloadStart(client.accountId);
    downloadMetrics.trackStart(is206);

    let bytesDelivered = 0;
    let currentStream: any = null;
    let completedCleanly = false;

    const cleanup = async (aborted: boolean) => {
      if (completedCleanly) return;
      completedCleanly = true;

      if (currentStream && typeof currentStream.destroy === 'function') {
        try {
          currentStream.destroy();
        } catch {}
      }

      scheduler.trackDownloadEnd(client.accountId);
      await lease.release();

      if (aborted) {
        downloadMetrics.trackAbort(bytesDelivered);
        log.info(
          { fileId: file._id, bytesDelivered, totalSize: contentLength },
          'Client cancelled download stream prematurely'
        );
      } else {
        downloadMetrics.trackComplete(bytesDelivered);
        await accountPool.recordSuccess(client.accountId, bytesDelivered);
      }
    };

    // Listen to client disconnects
    const onCloseListener = () => {
      if (!res.writableEnded) {
        cleanup(true);
      }
    };

    req.on('close', onCloseListener);
    res.on('close', onCloseListener);

    try {
      if (!chunks || chunks.length <= 1) {
        // Single chunk / primary message stream
        const streamOptions = is206 ? { start: rangeStart, end: rangeEnd } : undefined;
        currentStream = await client.downloadStream(fileId, messageId, streamOptions);

        currentStream.on('data', (chunk: Buffer) => {
          bytesDelivered += chunk.length;
        });

        currentStream.on('error', (err: any) => {
          log.error({ err, fileId: file._id }, 'Error reading download stream from storage');
          downloadMetrics.trackError();
          cleanup(true);
          if (!res.headersSent) {
            res.status(500).json({ success: false, error: { code: 'STORAGE_STREAM_ERROR', message: 'Storage stream read error' } });
          }
        });

        currentStream.pipe(res);

        await new Promise<void>((resolve, reject) => {
          res.on('finish', () => {
            cleanup(false);
            resolve();
          });
          currentStream.on('end', () => {
            // Wait for res finish to ensure socket flush
          });
          currentStream.on('error', reject);
        });

      } else {
        // Multi-chunk file with Range slicing support
        let cumulativeOffset = 0;

        for (const chunk of chunks) {
          if (res.writableEnded || req.destroyed) break;

          const chunkStart = cumulativeOffset;
          const chunkEnd = cumulativeOffset + chunk.size - 1;
          cumulativeOffset += chunk.size;

          // Check if this chunk overlaps the requested range
          if (chunkEnd < rangeStart || chunkStart > rangeEnd) {
            continue; // Skip chunk completely
          }

          // Calculate slice boundaries relative to this chunk
          const sliceStart = Math.max(0, rangeStart - chunkStart);
          const sliceEnd = Math.min(chunk.size - 1, rangeEnd - chunkStart);

          currentStream = await client.downloadStream(chunk.fileId, chunk.messageId, {
            start: sliceStart,
            end: sliceEnd,
          });

          currentStream.on('data', (c: Buffer) => {
            bytesDelivered += c.length;
          });

          await new Promise<void>((resolve, reject) => {
            currentStream.pipe(res, { end: false });
            currentStream.on('end', () => resolve());
            currentStream.on('error', (err: any) => reject(err));
          });
        }

        res.end();
        await cleanup(false);
      }
    } catch (err: any) {
      downloadMetrics.trackError();
      await cleanup(true);
      throw err;
    } finally {
      req.off('close', onCloseListener);
      res.off('close', onCloseListener);
    }
  }
}

export const downloadService = new DownloadService();
