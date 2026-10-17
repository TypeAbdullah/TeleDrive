import { Router, Request, Response, NextFunction } from 'express';
import { uploadService } from '../services/upload.service.js';
import { diskUploader, cleanupTempUpload } from '../infrastructure/upload/upload-storage.js';
import { idempotencyGuard } from '../infrastructure/upload/idempotency.js';
import { sendSuccess } from '../shared/response.js';
import { ValidationError } from '../shared/errors.js';

export const uploadRouter = Router();

/**
 * Direct file upload (single file) with disk-backed temp streaming
 * Keeps Node.js memory usage strictly bounded.
 */
uploadRouter.post(
  '/direct',
  idempotencyGuard(),
  diskUploader.single('file'),
  cleanupTempUpload,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.authUser!.id;
      const file = req.file;

      if (!file) {
        throw new ValidationError('No file was provided');
      }

      const folderId = req.body.folderId === 'root' || !req.body.folderId ? null : req.body.folderId;
      const result = await uploadService.uploadDirect({
        userId,
        fileName: file.originalname,
        mimeType: file.mimetype,
        filePath: file.path,
        fileSize: file.size,
        folderId,
      });

      sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Initialize resumable chunked upload
 */
uploadRouter.post(
  '/resumable/init',
  idempotencyGuard(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.authUser!.id;
      const { fileName, fileSize, mimeType, folderId, partSize } = req.body;

      if (!fileName || !fileSize) {
        throw new ValidationError('fileName and fileSize are required');
      }

      const result = await uploadService.initResumable({
        userId,
        fileName,
        fileSize: Number(fileSize),
        mimeType: mimeType || 'application/octet-stream',
        folderId: folderId === 'root' || !folderId ? null : folderId,
        partSize: partSize ? Number(partSize) : undefined,
      });

      sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Upload single chunk for a resumable job with bounded disk buffering
 */
uploadRouter.post(
  '/resumable/chunk',
  idempotencyGuard(),
  diskUploader.single('chunk'),
  cleanupTempUpload,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.authUser!.id;
      const { jobId, partIndex } = req.body;
      const file = req.file;

      if (!jobId || partIndex === undefined || !file) {
        throw new ValidationError('jobId, partIndex, and chunk data are required');
      }

      const result = await uploadService.uploadChunk({
        userId,
        jobId,
        partIndex: Number(partIndex),
        filePath: file.path,
        fileSize: file.size,
      });

      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Finalize resumable upload
 */
uploadRouter.post(
  '/resumable/complete',
  idempotencyGuard(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.authUser!.id;
      const { jobId } = req.body;

      if (!jobId) {
        throw new ValidationError('jobId is required');
      }

      const file = await uploadService.completeResumable(userId, jobId);
      sendSuccess(res, file, 201);
    } catch (err) {
      next(err);
    }
  }
);
