import { describe, it, expect, beforeEach } from 'vitest';
import { SessionHealthTracker } from '../infrastructure/telegram/session-health.js';

describe('SessionHealthTracker', () => {
  let tracker: SessionHealthTracker;

  beforeEach(() => {
    tracker = new SessionHealthTracker({
      circuitBreakerThreshold: 3,
      circuitBreakerResetTimeoutMs: 100, // Short for test
      latencyEmaAlpha: 0.5,
    });
  });

  it('registers a session with baseline score and closed circuit breaker', () => {
    const stats = tracker.registerSession('acc-1', 'Bot Account 1');
    expect(stats.accountId).toBe('acc-1');
    expect(stats.status).toBe('active');
    expect(stats.circuitBreaker).toBe('closed');
    expect(stats.score).toBe(100);
    expect(stats.consecutiveFailures).toBe(0);
  });

  it('updates latency and throughput EMA on success', () => {
    tracker.registerSession('acc-1', 'Bot Account 1');
    tracker.recordSuccess('acc-1', 100, 1024 * 1024);

    const stats = tracker.getStats('acc-1');
    expect(stats).toBeDefined();
    expect(stats!.successfulOps).toBe(1);
    expect(stats!.totalOps).toBe(1);
    expect(stats!.avgLatencyMs).toBe(75); // (0.5 * 100) + (0.5 * 50)
  });

  it('trips circuit breaker to open after consecutive failures threshold is reached', () => {
    tracker.registerSession('acc-1', 'Bot Account 1');

    tracker.recordFailure('acc-1', new Error('Network timeout'));
    expect(tracker.getStats('acc-1')!.circuitBreaker).toBe('closed');

    tracker.recordFailure('acc-1', new Error('Connection reset'));
    expect(tracker.getStats('acc-1')!.circuitBreaker).toBe('closed');

    tracker.recordFailure('acc-1', new Error('Telegram timeout'));
    const stats = tracker.getStats('acc-1')!;
    expect(stats.circuitBreaker).toBe('open');
    expect(stats.status).toBe('error');
    expect(stats.score).toBe(0); // Disqualified from pool
  });

  it('transitions open circuit to half-open after reset timeout and closes after 2 successes', async () => {
    tracker.registerSession('acc-1', 'Bot Account 1');

    // Trip circuit
    tracker.recordFailure('acc-1', new Error('err 1'));
    tracker.recordFailure('acc-1', new Error('err 2'));
    tracker.recordFailure('acc-1', new Error('err 3'));
    expect(tracker.getStats('acc-1')!.circuitBreaker).toBe('open');

    // Wait for reset timeout
    await new Promise(r => setTimeout(r, 120));

    // Calling evaluateState should move to half-open
    tracker.evaluateState('acc-1');
    let stats = tracker.getStats('acc-1')!;
    expect(stats.circuitBreaker).toBe('half-open');
    expect(stats.score).toBe(25); // Canary score

    // First trial success
    tracker.recordSuccess('acc-1', 50, 1000);
    expect(tracker.getStats('acc-1')!.circuitBreaker).toBe('half-open');

    // Second trial success closes circuit
    tracker.recordSuccess('acc-1', 40, 1000);
    stats = tracker.getStats('acc-1')!;
    expect(stats.circuitBreaker).toBe('closed');
    expect(stats.status).toBe('active');
    expect(stats.score).toBeGreaterThan(50);
  });

  it('detects Telegram FLOOD_WAIT and enters cooldown with score = 0', () => {
    tracker.registerSession('acc-1', 'Bot Account 1');

    tracker.recordFailure('acc-1', new Error('FLOOD_WAIT_10: A wait of 10 seconds is required'));
    const stats = tracker.getStats('acc-1')!;
    expect(stats.status).toBe('cooldown');
    expect(stats.floodWaitUntil).not.toBeNull();
    expect(stats.floodWaitUntil!.getTime()).toBeGreaterThan(Date.now() + 9000);
    expect(stats.score).toBe(0); // Disqualified while cooling down
  });

  it('calculates jittered exponential backoff for reconnections', () => {
    const delay0 = SessionHealthTracker.getReconnectDelay(0, 1000, 10000);
    expect(delay0).toBeGreaterThanOrEqual(0);
    expect(delay0).toBeLessThanOrEqual(1000);

    const delay3 = SessionHealthTracker.getReconnectDelay(3, 1000, 10000);
    expect(delay3).toBeGreaterThanOrEqual(0);
    expect(delay3).toBeLessThanOrEqual(8000);
  });
});
