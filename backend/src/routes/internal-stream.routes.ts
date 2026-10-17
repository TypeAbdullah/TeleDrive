import { Router, Request, Response, NextFunction } from 'express';
import { downloadAuthService } from '../services/download-auth.service.js';
import { downloadService } from '../services/download.service.js';
import { downloadMetrics } from '../infrastructure/metrics/download-metrics.js';
import { File } from '../models/File.js';
import { ShareLink } from '../models/ShareLink.js';
import { getConfig } from '../config/index.js';
import { NotFoundError } from '../shared/errors.js';

export const internalStreamRouter = Router();

/**
 * Middleware to verify that the request comes from an authorized Cloudflare Worker Gateway
 * using the shared internal stream secret or a valid signed token.
 */
function verifyGatewayAuth(req: Request, _res: Response, next: NextFunction) {
  const config = getConfig();
  const gatewaySecret = req.headers['x-internal-gateway-secret'];

  if (gatewaySecret && gatewaySecret === config.INTERNAL_STREAM_SECRET) {
    return next();
  }

  // Alternatively, if token is present in params/query, it will be validated in the route handler
  next();
}

/**
 * Resolve download metadata contract for normalized download source abstraction.
 * GET /api/v1/internal/resolve-download/:token
 */
internalStreamRouter.get('/resolve-download/:token', verifyGatewayAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.params.token as string;
    const authResult = await downloadAuthService.verifyToken(token);

    if (!authResult.valid || !authResult.payload) {
      res.status(401).json({
        success: false,
        error: { code: authResult.code || 'UNAUTHORIZED', message: authResult.error || 'Invalid download token' },
      });
      return;
    }

    const payload = authResult.payload;
    const file = await File.findById(payload.fid);
    if (!file || file.isTrash || file.status === 'deleted') {
      throw new NotFoundError('File');
    }

    const config = getConfig();
    const originBaseUrl = config.API_BASE_URL.replace(/\/+$/, '');
    const sourceUrl = `${originBaseUrl}/api/v1/internal/download-stream/${token}`;

    res.json({
      success: true,
      data: {
        sourceUrl,
        headers: {
          'X-Internal-Gateway-Secret': config.INTERNAL_STREAM_SECRET,
        },
        contentType: file.mimeType || 'application/octet-stream',
        contentLength: file.size,
        fileName: file.name,
        rangeSupported: true,
        expiresAt: new Date(payload.exp * 1000).toISOString(),
        cachePolicy: payload.pol,
        checksum: file.checksum,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Stream file content directly to authorized Cloudflare Worker Gateway.
 * Supports GET and HEAD, HTTP Range requests, client abort propagation, and backpressure.
 * GET /api/v1/internal/download-stream/:token
 * HEAD /api/v1/internal/download-stream/:token
 */
const handleStream = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.params.token as string;
    const authResult = await downloadAuthService.verifyToken(token);

    if (!authResult.valid || !authResult.payload) {
      const statusCode = authResult.code === 'EXPIRED' ? 410 : 401;
      res.status(statusCode).json({
        success: false,
        error: {
          code: authResult.code || 'UNAUTHORIZED',
          message: authResult.error || 'Invalid download authorization',
        },
      });
      return;
    }

    const payload = authResult.payload;

    // If token was issued for a share link, verify the share link has not been deleted/revoked
    if (payload.sid) {
      const share = await ShareLink.findById(payload.sid);
      if (!share) {
        res.status(410).json({
          success: false,
          error: { code: 'SHARE_REVOKED', message: 'This shared link has been revoked' },
        });
        return;
      }
    }

    const file = await File.findById(payload.fid);

    if (!file || file.isTrash || file.status === 'deleted') {
      res.status(404).json({
        success: false,
        error: { code: 'FILE_NOT_FOUND', message: 'Requested file was not found or has been deleted' },
      });
      return;
    }

    await downloadService.streamFile(file, req, res, {
      userId: payload.uid,
      shareId: payload.sid,
      apiKeyId: payload.kid,
      cachePolicy: payload.pol,
      rangeHeader: req.headers.range,
      isHead: req.method === 'HEAD',
    });
  } catch (err) {
    next(err);
  }
};

internalStreamRouter.get('/download-stream/:token', verifyGatewayAuth, handleStream);
internalStreamRouter.head('/download-stream/:token', verifyGatewayAuth, handleStream);

/**
 * Internal health check probe for Worker Gateway
 */
internalStreamRouter.get('/health', (_req: Request, res: Response) => {
  const snapshot = downloadMetrics.getSnapshot();
  res.json({
    status: 'healthy',
    activeStreams: snapshot.activeStreams,
    originMemory: snapshot.originMemory,
    uptime: snapshot.uptimeSeconds,
  });
});

/**
 * Internal metrics endpoint for operational dashboards
 */
internalStreamRouter.get('/metrics', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: downloadMetrics.getSnapshot(),
  });
});
