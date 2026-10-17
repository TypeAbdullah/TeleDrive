import { Request, Response, NextFunction } from 'express';
import { settingsService } from '../services/settings.service.js';
import { UserMeta } from '../models/UserMeta.js';

export async function maintenanceGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
  const url = req.originalUrl || req.url || req.path;
  // Always permit health, readiness, auth endpoints, and the admin control plane
  if (
    url === '/health' ||
    url === '/health/liveness' ||
    url === '/health/readiness' ||
    url === '/ready' ||
    url === '/health/metrics' ||
    url.startsWith('/api/auth') ||
    url.startsWith('/api/v1/admin') ||
    url.startsWith('/api/admin')
  ) {
    return next();
  }

  try {
    const { enabled, message } = await settingsService.isMaintenanceMode();
    if (!enabled) {
      return next();
    }

    // Check if requester is an authenticated administrator
    if (req.authUser?.id) {
      const meta = await UserMeta.findOne({ userId: req.authUser.id });
      if (meta?.role === 'admin') {
        return next(); // Admins bypass maintenance mode
      }
    }

    // Check if developer API key has admin scope
    if ((req as any).apiKey?.scopes?.includes('admin') || (req as any).apiKey?.scopes?.includes('*')) {
      return next();
    }

    res.status(503).json({
      success: false,
      error: {
        code: 'MAINTENANCE_MODE',
        message,
      },
    });
  } catch {
    next();
  }
}
