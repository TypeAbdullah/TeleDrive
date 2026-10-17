import type { Response } from 'express';

/**
 * Standardized API response envelope.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    requestId?: string;
    pagination?: PaginationMeta;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface CursorPaginationMeta {
  cursor: string | null;
  nextCursor: string | null;
  limit: number;
  hasMore: boolean;
}

/**
 * Send a successful JSON response.
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: ApiResponse['meta'],
): void {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };
  if (meta) response.meta = meta;

  res.status(statusCode).json(response);
}

/**
 * Send a paginated successful response.
 */
export function sendPaginated<T>(
  res: Response,
  data: T[],
  pagination: PaginationMeta,
  requestId?: string,
): void {
  sendSuccess(res, data, 200, {
    requestId,
    pagination,
  });
}

/**
 * Send an error JSON response.
 */
export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
  requestId?: string,
): void {
  const response: ApiResponse = {
    success: false,
    error: {
      code,
      message,
    },
    meta: requestId ? { requestId } : undefined,
  };
  if (details) response.error!.details = details;

  res.status(statusCode).json(response);
}
