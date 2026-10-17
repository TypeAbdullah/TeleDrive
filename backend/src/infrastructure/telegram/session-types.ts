export type SessionStatus = 'active' | 'cooldown' | 'error' | 'disabled' | 'reconnecting';

export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

export interface SessionHealthStats {
  accountId: string;
  label: string;
  status: SessionStatus;
  circuitBreaker: CircuitBreakerState;
  score: number; // 0 - 100
  activeUploads: number;
  activeDownloads: number;
  totalOps: number;
  successfulOps: number;
  failedOps: number;
  consecutiveFailures: number;
  avgLatencyMs: number;
  throughputBytesPerSec: number;
  floodWaitUntil: Date | null;
  lastUsedAt: Date | null;
  lastError: string | null;
}

export interface PoolConfig {
  maxUploadsPerAccount: number;
  maxDownloadsPerAccount: number;
  circuitBreakerThreshold: number; // Consecutive failures before opening circuit
  circuitBreakerResetTimeoutMs: number; // Time before testing half-open
  healthCheckIntervalMs: number;
  latencyEmaAlpha: number; // Alpha for exponential moving average
}
