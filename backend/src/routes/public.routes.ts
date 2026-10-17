import { Router, Request, Response, NextFunction } from 'express';
import { shareService } from '../services/share.service.js';
import { downloadService } from '../services/download.service.js';
import { downloadAuthService } from '../services/download-auth.service.js';
import { getConfig } from '../config/index.js';
import { sendSuccess } from '../shared/response.js';

export const publicRouter = Router();

/**
 * Public file preview metadata
 * GET /dl/:token
 */
publicRouter.get('/dl/:token', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.params.token as string;
    const password = req.query.password as string | undefined;

    const result = await shareService.resolveToken(token, password);

    if (result.requiresPassword) {
      res.status(200).json({
        success: true,
        data: {
          requiresPassword: true,
        },
      });
      return;
    }

    sendSuccess(res, {
      requiresPassword: false,
      file: {
        id: result.file._id,
        name: result.file.name,
        size: result.file.size,
        mimeType: result.file.mimeType,
        createdAt: result.file.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Public file signed download URL generation
 * GET /dl/:token/signed-url
 */
publicRouter.get('/dl/:token/signed-url', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.params.token as string;
    const password = req.query.password as string | undefined;

    const result = await shareService.resolveToken(token, password);

    if (result.requiresPassword) {
      res.status(401).json({
        success: false,
        error: { code: 'PASSWORD_REQUIRED', message: 'Password required to download this file' },
      });
      return;
    }

    const share = result.shareLink;
    const isPublicImmutable = share?.accessType === 'public' && !share.expiresAt && !share.maxDownloads;
    const policy = isPublicImmutable ? 'public' : 'revocable';

    const { token: signedToken, expiresAt } = downloadAuthService.generateToken({
      fileId: result.file._id.toString(),
      fileName: result.file.name,
      size: result.file.size,
      mimeType: result.file.mimeType,
      userId: 'anonymous',
      shareId: share?._id?.toString(),
      scope: 'download',
      policy,
      checksum: result.file.checksum,
    });

    const downloadUrl = downloadAuthService.buildDownloadUrl(signedToken);

    sendSuccess(res, {
      downloadUrl,
      expiresAt: expiresAt.toISOString(),
      file: {
        id: result.file._id,
        name: result.file.name,
        size: result.file.size,
        mimeType: result.file.mimeType,
      },
      rangeSupported: true,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Public file download / stream
 * GET /dl/:token/file
 * HEAD /dl/:token/file
 */
const handlePublicStream = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.params.token as string;
    const password = req.query.password as string | undefined;

    const result = await shareService.resolveToken(token, password);

    if (result.requiresPassword) {
      res.status(401).json({
        success: false,
        error: { code: 'PASSWORD_REQUIRED', message: 'Password required to download this file' },
      });
      return;
    }

    const config = getConfig();
    const share = result.shareLink;
    const isPublicImmutable = share?.accessType === 'public' && !share.expiresAt && !share.maxDownloads;
    const policy = isPublicImmutable ? 'public' : 'revocable';

    // If Worker redirect is enabled or client requested worker offload, redirect
    if (config.ENABLE_WORKER_DOWNLOAD_REDIRECT || req.query.redirect === 'worker') {
      const { token: signedToken } = downloadAuthService.generateToken({
        fileId: result.file._id.toString(),
        fileName: result.file.name,
        size: result.file.size,
        mimeType: result.file.mimeType,
        userId: 'anonymous',
        shareId: share?._id?.toString(),
        scope: 'download',
        policy,
        checksum: result.file.checksum,
      });

      const workerUrl = downloadAuthService.buildDownloadUrl(signedToken);
      res.redirect(302, workerUrl);
      return;
    }

    // Direct bounded-memory stream
    await downloadService.streamFile(result.file, req, res, {
      shareId: share?._id?.toString(),
      cachePolicy: policy,
      rangeHeader: req.headers.range,
      isHead: req.method === 'HEAD',
    });
  } catch (err) {
    next(err);
  }
};

publicRouter.get('/dl/:token/file', handlePublicStream);
publicRouter.head('/dl/:token/file', handlePublicStream);
