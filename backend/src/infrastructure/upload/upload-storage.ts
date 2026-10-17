import fs from 'fs';
import path from 'path';
import multer from 'multer';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { createModuleLogger } from '../../shared/logger.js';

const log = createModuleLogger('upload-storage');

const TEMP_UPLOAD_DIR = path.resolve(process.cwd(), '.temp_uploads');

if (!fs.existsSync(TEMP_UPLOAD_DIR)) {
  fs.mkdirSync(TEMP_UPLOAD_DIR, { recursive: true });
}

// Disk storage engine with unguessable temp file names
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, TEMP_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}_${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, unique);
  },
});

export const diskUploader = multer({
  storage,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB per chunk/upload
  },
});

/**
 * Middleware that guarantees temporary disk files are cleanly deleted
 * when the request finishes, aborts, or errors.
 */
export function cleanupTempUpload(req: Request, res: Response, next: NextFunction): void {
  const cleanup = () => {
    if (req.file && req.file.path) {
      fs.promises.unlink(req.file.path).catch(err => {
        if (err.code !== 'ENOENT') {
          log.warn({ path: req.file?.path, err: err.message }, 'Failed to delete temp upload file');
        }
      });
    }
  };

  res.on('finish', cleanup);
  res.on('close', cleanup);
  req.on('aborted', cleanup);

  next();
}
