import { Request, Response, NextFunction } from 'express';
import { developerService } from '../services/developer.service.js';
import { UnauthorizedError } from '../shared/errors.js';
import { IApiKey } from '../models/ApiKey.js';

declare global {
  namespace Express {
    interface Request {
      apiKey?: IApiKey;
    }
  }
}

export async function developerAuthGuard(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    let rawKey: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      rawKey = authHeader.substring(7).trim();
    } else if (req.headers['x-api-key']) {
      rawKey = String(req.headers['x-api-key']).trim();
    }

    if (!rawKey) {
      throw new UnauthorizedError('Missing API key. Provide via Bearer token or X-API-Key header.');
    }

    const apiKey = await developerService.validateKey(rawKey);
    req.apiKey = apiKey;
    req.authUser = { id: apiKey.userId } as any;

    next();
  } catch (err) {
    next(err);
  }
}
