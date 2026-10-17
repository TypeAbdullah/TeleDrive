import type { Request, Response, NextFunction } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { getAuth } from '../modules/auth/auth.js';
import { UnauthorizedError } from '../shared/errors.js';
import { createModuleLogger } from '../shared/logger.js';

const log = createModuleLogger('auth-middleware');

/**
 * Extend Express Request to include the Better Auth session/user.
 */
declare global {
  namespace Express {
    interface Request {
      /** Populated by authGuard middleware */
      authUser?: {
        id: string;
        email: string;
        name: string;
        image?: string | null;
      };
      authSession?: {
        id: string;
        userId: string;
        expiresAt: Date;
      };
    }
  }
}

/**
 * Auth guard middleware — requires a valid Better Auth session.
 * Populates req.authUser and req.authSession.
 */
export async function authGuard(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session || !session.user) {
      throw new UnauthorizedError('Invalid or expired session');
    }

    req.authUser = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      image: session.user.image,
    };

    req.authSession = {
      id: session.session.id,
      userId: session.session.userId,
      expiresAt: session.session.expiresAt,
    };

    next();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      next(err);
      return;
    }
    log.error({ err }, 'Auth middleware error');
    next(new UnauthorizedError('Authentication failed'));
  }
}

/**
 * Optional auth — populates user info if session exists, but doesn't block.
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (session?.user) {
      req.authUser = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
      };
      req.authSession = {
        id: session.session.id,
        userId: session.session.userId,
        expiresAt: session.session.expiresAt,
      };
    }
  } catch {
    // Silently continue without auth
  }
  next();
}
