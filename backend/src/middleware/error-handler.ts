import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/errors.js';
import { sendError } from '../shared/response.js';
import { createModuleLogger } from '../shared/logger.js';

const log = createModuleLogger('error-handler');

/**
 * Global error handler middleware.
 * Catches all errors thrown in route handlers and middleware,
 * formats them into a standardized API response.
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = req.requestId;

  if (err instanceof AppError) {
    // Operational errors — log at appropriate level
    if (err.statusCode >= 500) {
      log.error({ err, requestId, statusCode: err.statusCode, code: err.code }, err.message);
    } else {
      log.warn({ requestId, statusCode: err.statusCode, code: err.code }, err.message);
    }

    sendError(res, err.statusCode, err.code, err.message, err.details, requestId);
    return;
  }

  // Unexpected errors — always log the full stack
  log.error({ err, requestId }, 'Unhandled error');

  sendError(
    res,
    500,
    'INTERNAL_ERROR',
    process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    undefined,
    requestId,
  );
}
