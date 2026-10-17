import fs from 'fs';
import crypto from 'crypto';
import { nanoid } from 'nanoid';
import { File, IFile } from '../models/File.js';
import { UploadJob } from '../models/UploadJob.js';
import { UserMeta } from '../models/UserMeta.js';
import { scheduler } from '../infrastructure/telegram/scheduler.js';
import { accountPool } from '../infrastructure/telegram/pool.js';
import { metadataCache } from '../infrastructure/cache/cache-manager.js';
import { PayloadTooLargeError, ValidationError, NotFoundError, AppError } from '../shared/errors.js';
import { createModuleLogger } from '../shared/logger.js';
import { getConfig } from '../config/index.js';

const log = createModuleLogger('upload-service');

async function calculateFileChecksum(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

export class UploadService {
  /**
   * Direct upload of an entire file (small / standard files).
   * Supports either in-memory buffer or disk-streamed filePath to keep memory bounded.
   */
  async uploadDirect(params: {
    userId: string;
    fileName: string;
    mimeType: string;
    buffer?: Buffer;
    filePath?: string;
    fileSize?: number;
    folderId?: string | null;
  }): Promise<IFile> {
    const config = getConfig();
    let fileSize = params.fileSize;

    if (fileSize === undefined) {
      if (params.filePath) {
        const stats = await fs.promises.stat(params.filePath);
        fileSize = stats.size;
      } else if (params.buffer) {
        fileSize = params.buffer.length;
      } else {
        throw new ValidationError('Either buffer or filePath must be provided');
      }
    }

    if (fileSize > config.MAX_UPLOAD_SIZE) {
      throw new PayloadTooLargeError(`File exceeds maximum allowed size of ${config.MAX_UPLOAD_SIZE} bytes`);
    }

    // Check user quota
    let meta = await UserMeta.findOne({ userId: params.userId });
    if (!meta) {
      meta = await UserMeta.create({ userId: params.userId });
    }

    if (meta.usedBytes + fileSize > meta.quotaBytes) {
      throw new AppError('Upload would exceed your storage quota', 400, 'QUOTA_EXCEEDED');
    }

    // Select account from Telegram pool
    const client = await scheduler.selectForUpload();
    scheduler.trackUploadStart(client.accountId);

    const startTime = Date.now();
    try {
      const uploadResult = await client.uploadChunk({
        fileName: params.fileName,
        mimeType: params.mimeType,
        fileSize,
        buffer: params.buffer,
        filePath: params.filePath,
      });

      let checksum = '';
      if (params.filePath) {
        checksum = await calculateFileChecksum(params.filePath);
      } else if (params.buffer) {
        checksum = crypto.createHash('sha256').update(params.buffer).digest('hex');
      }

      const file = await File.create({
        userId: params.userId,
        folderId: params.folderId || null,
        name: params.fileName,
        size: fileSize,
        mimeType: params.mimeType,
        checksum,
        status: 'ready',
        storageRef: {
          accountId: client.accountId,
          peerId: 'me',
          messageId: uploadResult.messageId,
          fileId: uploadResult.fileId,
        },
      });

      // Update user usedBytes and account stats
      await UserMeta.findOneAndUpdate({ userId: params.userId }, { $inc: { usedBytes: fileSize } });
      const durationMs = Date.now() - startTime;
      await accountPool.recordSuccess(client.accountId, fileSize, durationMs);

      // Invalidate metadata caches
      await metadataCache.invalidate(`folder:${params.folderId || 'root'}:${params.userId}`);

      log.info({ fileId: file._id, accountId: client.accountId, fileSize }, 'Direct upload completed');
      return file;
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      await accountPool.recordError(client.accountId, err, durationMs);
      throw err;
    } finally {
      scheduler.trackUploadEnd(client.accountId);
    }
  }

  /**
   * Initialize a resumable chunked upload job
   */
  async initResumable(params: {
    userId: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    folderId?: string | null;
    partSize?: number;
  }): Promise<{ jobId: string; totalParts: number; partSize: number }> {
    const config = getConfig();
    const partSize = params.partSize || config.UPLOAD_CHUNK_SIZE || 524288; // 512KB default
    const totalParts = Math.ceil(params.fileSize / partSize);

    // Check quota
    let meta = await UserMeta.findOne({ userId: params.userId });
    if (!meta) {
      meta = await UserMeta.create({ userId: params.userId });
    }
    if (meta.usedBytes + params.fileSize > meta.quotaBytes) {
      throw new AppError('File would exceed your storage quota', 400, 'QUOTA_EXCEEDED');
    }

    const jobId = nanoid(16);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24hr TTL

    await UploadJob.create({
      jobId,
      userId: params.userId,
      fileName: params.fileName,
      fileSize: params.fileSize,
      mimeType: params.mimeType,
      folderId: params.folderId || null,
      totalParts,
      uploadedParts: [],
      partSize,
      status: 'pending',
      chunks: [],
      expiresAt,
    });

    log.info({ jobId, totalParts, partSize }, 'Resumable upload session initialized');
    return { jobId, totalParts, partSize };
  }

  /**
   * Upload an individual part/chunk of a resumable upload
   */
  async uploadChunk(params: {
    userId: string;
    jobId: string;
    partIndex: number;
    buffer?: Buffer;
    filePath?: string;
    fileSize?: number;
  }): Promise<{ partIndex: number; uploadedParts: number[]; totalParts: number }> {
    const job = await UploadJob.findOne({ jobId: params.jobId, userId: params.userId });
    if (!job) {
      throw new NotFoundError('Upload session');
    }

    if (job.status === 'completed' || job.status === 'cancelled') {
      throw new ValidationError(`Upload job is already ${job.status}`);
    }

    // Check if chunk already uploaded
    if (job.uploadedParts.includes(params.partIndex)) {
      return { partIndex: params.partIndex, uploadedParts: job.uploadedParts, totalParts: job.totalParts };
    }

    let chunkSize = params.fileSize;
    if (chunkSize === undefined) {
      if (params.filePath) {
        chunkSize = (await fs.promises.stat(params.filePath)).size;
      } else if (params.buffer) {
        chunkSize = params.buffer.length;
      } else {
        throw new ValidationError('Either buffer or filePath must be provided');
      }
    }

    const client = await scheduler.selectForUpload();
    scheduler.trackUploadStart(client.accountId);

    const startTime = Date.now();
    try {
      const chunkName = `${job.fileName}.part${params.partIndex}`;
      const uploadResult = await client.uploadChunk({
        fileName: chunkName,
        mimeType: 'application/octet-stream',
        fileSize: chunkSize,
        buffer: params.buffer,
        filePath: params.filePath,
      });

      let checksum = '';
      if (params.filePath) {
        checksum = await calculateFileChecksum(params.filePath);
      } else if (params.buffer) {
        checksum = crypto.createHash('sha256').update(params.buffer).digest('hex');
      }

      job.uploadedParts.push(params.partIndex);
      job.chunks.push({
        partIndex: params.partIndex,
        messageId: uploadResult.messageId,
        fileId: uploadResult.fileId,
        size: chunkSize,
        checksum,
      });

      job.status = job.uploadedParts.length === job.totalParts ? 'assembling' : 'uploading';
      await job.save();

      const durationMs = Date.now() - startTime;
      await accountPool.recordSuccess(client.accountId, chunkSize, durationMs);

      return {
        partIndex: params.partIndex,
        uploadedParts: job.uploadedParts,
        totalParts: job.totalParts,
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      await accountPool.recordError(client.accountId, err, durationMs);
      throw err;
    } finally {
      scheduler.trackUploadEnd(client.accountId);
    }
  }

  /**
   * Complete the resumable upload and assemble file record
   */
  async completeResumable(userId: string, jobId: string): Promise<IFile> {
    const job = await UploadJob.findOne({ jobId, userId });
    if (!job) {
      throw new NotFoundError('Upload job');
    }

    if (job.uploadedParts.length < job.totalParts) {
      throw new ValidationError(`Only ${job.uploadedParts.length}/${job.totalParts} chunks uploaded`);
    }

    // Sort chunks by partIndex
    const sortedChunks = [...job.chunks].sort((a, b) => a.partIndex - b.partIndex);

    const primaryChunk = sortedChunks[0];
    const file = await File.create({
      userId,
      folderId: job.folderId,
      name: job.fileName,
      size: job.fileSize,
      mimeType: job.mimeType,
      status: 'ready',
      storageRef: {
        accountId: job.accountId || primaryChunk?.fileId ? 'primary' : 'local_storage',
        peerId: 'me',
        messageId: primaryChunk.messageId,
        fileId: primaryChunk.fileId,
        chunks: sortedChunks,
      },
    });

    job.status = 'completed';
    await job.save();

    await UserMeta.findOneAndUpdate({ userId }, { $inc: { usedBytes: job.fileSize } });
    await metadataCache.invalidate(`folder:${job.folderId || 'root'}:${userId}`);

    log.info({ fileId: file._id, jobId }, 'Resumable upload completed successfully');
    return file;
  }
}

export const uploadService = new UploadService();
