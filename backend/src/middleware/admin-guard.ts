import { Request, Response, NextFunction } from 'express';
import { authGuard } from './auth-guard.js';
import { UserMeta } from '../models/UserMeta.js';
import { ForbiddenError } from '../shared/errors.js';
import { getConfig } from '../config/index.js';

declare global {
  namespace Express {
    interface Request {
      adminUser?: {
        id: string;
        email: string;
        name: string;
      };
    }
  }
}

export async function adminGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
  // First ensure standard session authentication
  authGuard(req, res, async (err?: any) => {
    if (err) return next(err);

    try {
      const userId = req.authUser!.id;
      let meta = await UserMeta.findOne({ userId });

      // In development, auto-promote first or dev user to admin if needed
      if (!meta) {
        const totalUsers = await UserMeta.countDocuments();
        const config = getConfig();
        const shouldBeAdmin = totalUsers === 0 || config.NODE_ENV === 'development';
        meta = await UserMeta.create({
          userId,
          role: shouldBeAdmin ? 'admin' : 'user',
        });
      }

      if (meta.role !== 'admin') {
        throw new ForbiddenError('Administrative privileges required to access this resource');
      }

      req.adminUser = {
        id: userId,
        email: req.authUser!.email,
        name: req.authUser!.name,
      };

      next();
    } catch (guardErr) {
      next(guardErr);
    }
  });
}
