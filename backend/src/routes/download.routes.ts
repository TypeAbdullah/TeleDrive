import { Router, Request, Response, NextFunction } from 'express';
import { fileService } from '../services/file.service.js';
import { downloadService } from '../services/download.service.js';
import { downloadAuthService } from '../services/download-auth.service.js';
import { getConfig } from '../config/index.js';
import { sendSuccess } from '../shared/response.js';

export const downloadRouter = Router();

/**
 * Generate short-lived signed download authorization URL for authenticated web app user.
 * GET /api/v1/download/:id/signed-url
 */
downloadRouter.get('/:id/signed-url', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.authUser!.id;
    const file = await fileService.getFileById(userId, req.params.id as string);

    const { token, expiresAt } = downloadAuthService.generateToken({
      fileId: file._id.toString(),
      fileName: file.name,
      size: file.size,
      mimeType: file.mimeType,
      userId,
      scope: 'download',
      policy: 'private',
      checksum: file.checksum,
    });

    const downloadUrl = downloadAuthService.buildDownloadUrl(token);

    sendSuccess(res, {
      downloadUrl,
      expiresAt: expiresAt.toISOString(),
      file: {
        id: file._id,
        name: file.name,
        size: file.size,
        mimeType: file.mimeType,
      },
      rangeSupported: true,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Download file directly or redirect to Cloudflare Worker Gateway if enabled.
 * GET /api/v1/download/:id
 * HEAD /api/v1/download/:id
 */
const handleDownload = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.authUser!.id;
    const file = await fileService.getFileById(userId, req.params.id as string);
    const config = getConfig();

    // If Worker redirect is enabled or explicitly requested, offload to Cloudflare Edge
    if (config.ENABLE_WORKER_DOWNLOAD_REDIRECT || req.query.redirect === 'worker') {
      const { token } = downloadAuthService.generateToken({
        fileId: file._id.toString(),
        fileName: file.name,
        size: file.size,
        mimeType: file.mimeType,
        userId,
        scope: 'download',
        policy: 'private',
        checksum: file.checksum,
      });

      const workerUrl = downloadAuthService.buildDownloadUrl(token);
      res.redirect(302, workerUrl);
      return;
    }

    // Direct bounded-memory stream fallback
    await downloadService.streamFile(file, req, res, {
      userId,
      rangeHeader: req.headers.range,
      isHead: req.method === 'HEAD',
      cachePolicy: 'private',
    });
  } catch (err) {
    next(err);
  }
};

downloadRouter.get('/:id', handleDownload);
downloadRouter.head('/:id', handleDownload);
