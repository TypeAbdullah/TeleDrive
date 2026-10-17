import { Router, Request, Response, NextFunction } from 'express';
import { fileService } from '../services/file.service.js';
import { uploadService } from '../services/upload.service.js';
import { downloadAuthService } from '../services/download-auth.service.js';
import { diskUploader, cleanupTempUpload } from '../infrastructure/upload/upload-storage.js';
import { idempotencyGuard } from '../infrastructure/upload/idempotency.js';
import { openApiSpecification } from './developer-api.openapi.js';
import { sendSuccess } from '../shared/response.js';
import { ValidationError, ForbiddenError } from '../shared/errors.js';

export const developerApiRouter = Router();

function checkScope(apiKeyScopes: string[] | undefined, requiredScopes: string[]): boolean {
  if (!apiKeyScopes || apiKeyScopes.length === 0) return true; // Default unconstrained
  if (apiKeyScopes.includes('*') || apiKeyScopes.includes('admin')) return true;

  for (const reqScope of requiredScopes) {
    if (apiKeyScopes.includes(reqScope)) return true;
    // Backwards compatibility mappings
    if (reqScope === 'files:read' && apiKeyScopes.includes('read')) return true;
    if (reqScope === 'files:write' && apiKeyScopes.includes('write')) return true;
  }
  return false;
}

/**
 * GET /developer/v1/openapi.json
 * Expose OpenAPI 3.0 specification for developer API clients
 */
developerApiRouter.get('/openapi.json', (_req: Request, res: Response) => {
  res.json(openApiSpecification);
});

developerApiRouter.get('/status', (_req: Request, res: Response) => {
  sendSuccess(res, {
    api: 'TeleDrive Developer API',
    version: 'v1',
    status: 'operational',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /developer/v1/files
 * List files with pagination and folder filtering
 */
developerApiRouter.get('/files', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.authUser!.id;
    const apiKey = req.apiKey;

    if (!checkScope(apiKey?.scopes, ['files:read'])) {
      throw new ForbiddenError('API key missing required scope: "files:read"');
    }

    const folderId = req.query.folderId === 'root' || !req.query.folderId ? null : (req.query.folderId as string);
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '50'), 10)));

    const allFiles = await fileService.listFiles(userId, { folderId });
    const total = allFiles.length;
    const startIdx = (page - 1) * limit;
    const paginatedFiles = allFiles.slice(startIdx, startIdx + limit);

    sendSuccess(res, {
      items: paginatedFiles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /developer/v1/upload
 * Direct bounded streaming upload with idempotency support
 */
developerApiRouter.post(
  '/upload',
  idempotencyGuard(),
  diskUploader.single('file'),
  cleanupTempUpload,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.authUser!.id;
      const apiKey = req.apiKey;

      if (!checkScope(apiKey?.scopes, ['files:write'])) {
        throw new ForbiddenError('API key missing required scope: "files:write"');
      }

      const file = req.file;
      if (!file) {
        throw new ValidationError('No file was provided in form-data "file" field');
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

developerApiRouter.get('/files/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.authUser!.id;
    const apiKey = req.apiKey;

    if (!checkScope(apiKey?.scopes, ['files:read'])) {
      throw new ForbiddenError('API key missing required scope: "files:read"');
    }

    const file = await fileService.getFileById(userId, req.params.id as string);
    sendSuccess(res, file);
  } catch (err) {
    next(err);
  }
});

developerApiRouter.delete('/files/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.authUser!.id;
    const apiKey = req.apiKey;

    if (!checkScope(apiKey?.scopes, ['files:write'])) {
      throw new ForbiddenError('API key missing required scope: "files:write"');
    }

    await fileService.deletePermanently(userId, req.params.id as string);
    sendSuccess(res, { message: 'File deleted' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /developer/v1/files/:fileId/downloads
 * Generate a short-lived, cryptographically signed download authorization URL.
 */
developerApiRouter.post('/files/:fileId/downloads', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.authUser!.id;
    const apiKey = req.apiKey;

    if (!checkScope(apiKey?.scopes, ['files:read', 'shares:read'])) {
      throw new ForbiddenError('API key missing required scope: "files:read" or "shares:read"');
    }

    const fileId = (req.params.fileId || req.params.id) as string;
    const file = await fileService.getFileById(userId, fileId);

    let requestedTtl: number | undefined;
    if (req.body?.expiresInSeconds) {
      const parsed = parseInt(String(req.body.expiresInSeconds), 10);
      if (!isNaN(parsed) && parsed >= 60 && parsed <= 86400) {
        requestedTtl = parsed;
      }
    }

    const { token, expiresAt } = downloadAuthService.generateToken({
      fileId: file._id.toString(),
      fileName: file.name,
      size: file.size,
      mimeType: file.mimeType,
      userId,
      apiKeyId: apiKey?.keyId,
      scope: 'download',
      policy: 'private',
      checksum: file.checksum,
      expiresInSeconds: requestedTtl,
    });

    const downloadUrl = downloadAuthService.buildDownloadUrl(token);

    sendSuccess(
      res,
      {
        downloadUrl,
        expiresAt: expiresAt.toISOString(),
        file: {
          id: file._id,
          name: file.name,
          size: file.size,
          mimeType: file.mimeType,
        },
        rangeSupported: true,
      },
      201
    );
  } catch (err) {
    next(err);
  }
});
