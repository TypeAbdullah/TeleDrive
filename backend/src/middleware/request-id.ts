import type { Request, Response, NextFunction } from 'express';
import { nanoid } from 'nanoid';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

/**
 * Attach a unique request ID to every incoming request.
 * Checks for an existing X-Request-ID header (from a reverse proxy),
 * otherwise generates one.
 */
export function requestIdMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const existingId = req.headers['x-request-id'];
  req.requestId = (typeof existingId === 'string' && existingId) ? existingId : nanoid(21);
  _res.setHeader('X-Request-ID', req.requestId);
  next();
}
