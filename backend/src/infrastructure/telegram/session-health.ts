import { SessionHealthStats, PoolConfig } from './session-types.js';
import { createModuleLogger } from '../../shared/logger.js';

const log = createModuleLogger('session-health');

export const DEFAULT_POOL_CONFIG: PoolConfig = {
  maxUploadsPerAccount: 5,
  maxDownloadsPerAccount: 10,
  circuitBreakerThreshold: 3,
  circuitBreakerResetTimeoutMs: 30_000, // 30 seconds
  healthCheckIntervalMs: 15_000,        // 15 seconds
  latencyEmaAlpha: 0.2,                 // Smoothing factor
};

export class SessionHealthTracker {
  private stats: Map<string, SessionHealthStats> = new Map();
  private halfOpenSuccesses: Map<string, number> = new Map();
  private lastFailureTimes: Map<string, number> = new Map();
  private config: PoolConfig;

  constructor(config: Partial<PoolConfig> = {}) {
    this.config = { ...DEFAULT_POOL_CONFIG, ...config };
  }

  registerSession(accountId: string, label: string): SessionHealthStats {
    const existing = this.stats.get(accountId);
    if (existing) {
      existing.label = label;
      return existing;
    }

    const initial: SessionHealthStats = {
      accountId,
      label,
      status: 'active',
      circuitBreaker: 'closed',
      score: 100,
      activeUploads: 0,
      activeDownloads: 0,
      totalOps: 0,
      successfulOps: 0,
      failedOps: 0,
      consecutiveFailures: 0,
      avgLatencyMs: 50,
      throughputBytesPerSec: 1024 * 1024, // Initial 1MB/s baseline
      floodWaitUntil: null,
      lastUsedAt: null,
      lastError: null,
    };

    this.stats.set(accountId, initial);
    return initial;
  }

  unregisterSession(accountId: string): void {
    this.stats.delete(accountId);
    this.halfOpenSuccesses.delete(accountId);
    this.lastFailureTimes.delete(accountId);
  }

  getStats(accountId: string): SessionHealthStats | undefined {
    this.evaluateState(accountId);
    return this.stats.get(accountId);
  }

  getAllStats(): SessionHealthStats[] {
    for (const accountId of this.stats.keys()) {
      this.evaluateState(accountId);
    }
    return Array.from(this.stats.values());
  }

  recordOperationStart(accountId: string, type: 'upload' | 'download'): void {
    const stat = this.stats.get(accountId);
    if (!stat) return;

    if (type === 'upload') {
      stat.activeUploads++;
    } else {
      stat.activeDownloads++;
    }
    stat.lastUsedAt = new Date();
    stat.score = this.computeScore(stat);
  }

  recordOperationEnd(accountId: string, type: 'upload' | 'download'): void {
    const stat = this.stats.get(accountId);
    if (!stat) return;

    if (type === 'upload') {
      stat.activeUploads = Math.max(0, stat.activeUploads - 1);
    } else {
      stat.activeDownloads = Math.max(0, stat.activeDownloads - 1);
    }
    stat.score = this.computeScore(stat);
  }

  recordSuccess(accountId: string, durationMs: number, bytesTransferred = 0): void {
    const stat = this.stats.get(accountId);
    if (!stat) return;

    stat.totalOps++;
    stat.successfulOps++;
    stat.consecutiveFailures = 0;
    stat.lastError = null;

    // Exponential moving average for latency
    if (durationMs > 0) {
      stat.avgLatencyMs = Math.round(
        this.config.latencyEmaAlpha * durationMs + (1 - this.config.latencyEmaAlpha) * stat.avgLatencyMs
      );
    }

    // Exponential moving average for throughput
    if (bytesTransferred > 0 && durationMs > 0) {
      const currentThroughput = (bytesTransferred / durationMs) * 1000;
      stat.throughputBytesPerSec = Math.round(
        this.config.latencyEmaAlpha * currentThroughput + (1 - this.config.latencyEmaAlpha) * stat.throughputBytesPerSec
      );
    }

    // Circuit breaker half-open transition check
    if (stat.circuitBreaker === 'half-open') {
      const successes = (this.halfOpenSuccesses.get(accountId) || 0) + 1;
      this.halfOpenSuccesses.set(accountId, successes);

      if (successes >= 2) {
        log.info({ accountId, label: stat.label }, 'Circuit breaker closed after successful trial requests');
        stat.circuitBreaker = 'closed';
        stat.status = 'active';
        this.halfOpenSuccesses.delete(accountId);
      }
    }

    stat.score = this.computeScore(stat);
  }

  recordFailure(accountId: string, error: unknown, durationMs?: number): void {
    const stat = this.stats.get(accountId);
    if (!stat) return;

    stat.totalOps++;
    stat.failedOps++;
    stat.consecutiveFailures++;
    const errMsg = error instanceof Error ? error.message : String(error);
    stat.lastError = errMsg;
    this.lastFailureTimes.set(accountId, Date.now());

    if (durationMs && durationMs > 0) {
      stat.avgLatencyMs = Math.round(
        this.config.latencyEmaAlpha * durationMs + (1 - this.config.latencyEmaAlpha) * stat.avgLatencyMs
      );
    }

    // 1. Detect FLOOD_WAIT
    const floodMatch = errMsg.match(/FLOOD_WAIT_(\d+)/i);
    if (floodMatch) {
      const waitSeconds = parseInt(floodMatch[1], 10);
      const jitterMs = Math.floor(Math.random() * 2000); // 0-2s jitter
      stat.status = 'cooldown';
      stat.floodWaitUntil = new Date(Date.now() + waitSeconds * 1000 + jitterMs);
      log.warn({ accountId, waitSeconds, floodWaitUntil: stat.floodWaitUntil }, 'Telegram FLOOD_WAIT cooldown triggered');
    }

    // 2. Circuit Breaker trigger check
    if (stat.circuitBreaker === 'closed' && stat.consecutiveFailures >= this.config.circuitBreakerThreshold) {
      stat.circuitBreaker = 'open';
      if (stat.status !== 'cooldown') {
        stat.status = 'error';
      }
      log.error(
        { accountId, label: stat.label, consecutiveFailures: stat.consecutiveFailures },
        'Circuit breaker tripped to OPEN'
      );
    } else if (stat.circuitBreaker === 'half-open') {
      // Re-trip on failure during canary
      stat.circuitBreaker = 'open';
      stat.status = 'error';
      this.halfOpenSuccesses.set(accountId, 0);
      log.warn({ accountId }, 'Trial request failed in half-open state; circuit reopened');
    }

    stat.score = this.computeScore(stat);
  }

  /**
   * Computes a weighted score between 0 and 100.
   * Score = (Success Rate * 40) + (Latency Score * 25) + (Throughput Score * 15) + (Capacity Score * 20)
   */
  computeScore(stat: SessionHealthStats): number {
    // Hard disqualifications
    if (stat.status === 'disabled') return 0;
    if (stat.circuitBreaker === 'open') return 0;

    if (stat.status === 'cooldown' && stat.floodWaitUntil) {
      if (Date.now() < stat.floodWaitUntil.getTime()) {
        return 0; // Still cooling down
      }
    }

    // Half-open canary limit
    if (stat.circuitBreaker === 'half-open') {
      return 25; // Controlled canary score
    }

    // Component 1: Success Rate (0 to 40 pts)
    let successRateScore = 40;
    if (stat.totalOps > 0) {
      const rate = stat.successfulOps / stat.totalOps;
      successRateScore = Math.round(rate * 40);
    }

    // Component 2: Latency Score (0 to 25 pts)
    // < 100ms = 25 pts, > 2000ms = 0 pts
    let latencyScore = 25;
    if (stat.avgLatencyMs > 100) {
      const penalty = ((stat.avgLatencyMs - 100) / 1900) * 25;
      latencyScore = Math.max(0, Math.round(25 - penalty));
    }

    // Component 3: Throughput Score (0 to 15 pts)
    // > 10MB/s = 15 pts, scaled down linearly to 0 pts at 0 bytes/s
    const targetThroughput = 10 * 1024 * 1024; // 10MB/s
    const throughputScore = Math.min(15, Math.round((stat.throughputBytesPerSec / targetThroughput) * 15));

    // Component 4: Capacity / Concurrency Score (0 to 20 pts)
    const maxTotalLoad = this.config.maxUploadsPerAccount + this.config.maxDownloadsPerAccount;
    const currentLoad = stat.activeUploads + stat.activeDownloads;
    const capacityScore = Math.max(0, Math.round((1 - currentLoad / maxTotalLoad) * 20));

    const total = successRateScore + latencyScore + throughputScore + capacityScore;
    return Math.max(0, Math.min(100, total));
  }

  evaluateState(accountId: string): void {
    const stat = this.stats.get(accountId);
    if (!stat) return;

    const now = Date.now();

    // 1. Recover from Flood Wait cooldown if expired
    if (stat.status === 'cooldown' && stat.floodWaitUntil) {
      if (now >= stat.floodWaitUntil.getTime()) {
        log.info({ accountId, label: stat.label }, 'Session flood wait cooldown expired; returning to active');
        stat.status = 'active';
        stat.floodWaitUntil = null;
        stat.consecutiveFailures = 0;
        stat.circuitBreaker = 'closed';
      }
    }

    // 2. Transition open circuit to half-open after reset timeout
    if (stat.circuitBreaker === 'open') {
      const lastFailure = this.lastFailureTimes.get(accountId) || 0;
      if (now - lastFailure >= this.config.circuitBreakerResetTimeoutMs) {
        log.info({ accountId, label: stat.label }, 'Circuit breaker reset timeout reached; testing HALF-OPEN');
        stat.circuitBreaker = 'half-open';
        stat.status = 'active';
        this.halfOpenSuccesses.set(accountId, 0);
      }
    }

    stat.score = this.computeScore(stat);
  }

  /**
   * Calculates exponential backoff with full jitter for reconnections
   */
  static getReconnectDelay(attempt: number, baseMs = 1000, maxMs = 60000): number {
    const exponential = Math.min(maxMs, baseMs * Math.pow(2, Math.max(0, attempt)));
    // Full jitter between 0 and exponential
    return Math.floor(Math.random() * exponential);
  }
}

export const sessionHealth = new SessionHealthTracker();
