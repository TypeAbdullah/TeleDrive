/**
 * TeleDrive — Error Classes
 *
 * Structured error hierarchy for consistent error handling across the application.
 * All errors carry an HTTP status code, machine-readable error code, and optional details.
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    isOperational = true,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ── Authentication & Authorization ───────────────────────────────────────────

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', details?: Record<string, unknown>) {
    super(message, 401, 'UNAUTHORIZED', true, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied', details?: Record<string, unknown>) {
    super(message, 403, 'FORBIDDEN', true, details);
  }
}

// ── Resource Errors ──────────────────────────────────────────────────────────

export class NotFoundError extends AppError {
  constructor(resource = 'Resource', details?: Record<string, unknown>) {
    super(`${resource} not found`, 404, 'NOT_FOUND', true, details);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists', details?: Record<string, unknown>) {
    super(message, 409, 'CONFLICT', true, details);
  }
}

export class GoneError extends AppError {
  constructor(message = 'Resource is no longer available', details?: Record<string, unknown>) {
    super(message, 410, 'GONE', true, details);
  }
}

// ── Validation Errors ────────────────────────────────────────────────────────

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: Record<string, unknown>) {
    super(message, 400, 'VALIDATION_ERROR', true, details);
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message = 'File exceeds maximum allowed size', details?: Record<string, unknown>) {
    super(message, 413, 'PAYLOAD_TOO_LARGE', true, details);
  }
}

// ── Rate Limiting ────────────────────────────────────────────────────────────

export class RateLimitError extends AppError {
  public readonly retryAfterMs: number;

  constructor(retryAfterMs: number, message = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', true, { retryAfterMs });
    this.retryAfterMs = retryAfterMs;
  }
}

// ── Telegram Errors ──────────────────────────────────────────────────────────

export class TelegramError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 502, 'TELEGRAM_ERROR', true, details);
  }
}

export class TelegramFloodWaitError extends TelegramError {
  public readonly waitSeconds: number;

  constructor(waitSeconds: number, accountId: string) {
    super(`Telegram flood wait: ${waitSeconds}s`, { waitSeconds, accountId });
    this.waitSeconds = waitSeconds;
  }
}

export class TelegramSessionError extends TelegramError {
  constructor(message: string, accountId: string) {
    super(message, { accountId });
  }
}

// ── Storage & Upload Errors ──────────────────────────────────────────────────

export class StorageError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 500, 'STORAGE_ERROR', false, details);
  }
}

export class UploadError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 500, 'UPLOAD_ERROR', true, details);
  }
}

export class NoAvailableAccountError extends AppError {
  constructor(message = 'No storage accounts available') {
    super(message, 503, 'NO_AVAILABLE_ACCOUNTS', true);
  }
}

export class QuotaExceededError extends AppError {
  constructor(message = 'Storage quota exceeded', details?: Record<string, unknown>) {
    super(message, 507, 'QUOTA_EXCEEDED', true, details);
  }
}

// ── Infrastructure Errors ────────────────────────────────────────────────────

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable', details?: Record<string, unknown>) {
    super(message, 503, 'SERVICE_UNAVAILABLE', true, details);
  }
}

export class InternalError extends AppError {
  constructor(message = 'Internal server error', details?: Record<string, unknown>) {
    super(message, 500, 'INTERNAL_ERROR', false, details);
  }
}
