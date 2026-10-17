import { describe, it, expect, beforeEach } from 'vitest';
import { concurrencyGuard } from '../infrastructure/concurrency/concurrency-guard.js';
import { loadConfig } from '../config/env.js';

describe('ConcurrencyGuard — Distributed Download Protection', () => {
  beforeEach(() => {
    process.env.BETTER_AUTH_SECRET = 'test-secret-at-least-32-chars-long-for-testing';
    process.env.DISCORD_CLIENT_ID = 'test-discord-id';
    process.env.DISCORD_CLIENT_SECRET = 'test-discord-secret';
    process.env.MONGODB_URI = 'mongodb://localhost:27017/teledrive-test';
    process.env.MAX_CONCURRENT_DOWNLOADS_PER_USER = '2'; // Low limit for test
    process.env.MAX_CONCURRENT_DOWNLOADS_PER_SHARE = '2';
    process.env.MAX_CONCURRENT_DOWNLOADS_PER_API_KEY = '2';
    process.env.MAX_CONCURRENT_DOWNLOADS_PER_ACCOUNT = '2';
    loadConfig();
  });

  it('allows leases up to the configured concurrency limit and blocks beyond it', async () => {
    const userId = 'user-concurrency-test-' + Date.now();

    // 1st lease: allowed
    const lease1 = await concurrencyGuard.acquireLease({ userId });
    expect(lease1.allowed).toBe(true);

    // 2nd lease: allowed (limit is 2)
    const lease2 = await concurrencyGuard.acquireLease({ userId });
    expect(lease2.allowed).toBe(true);

    // 3rd lease: blocked (exceeds limit 2)
    const lease3 = await concurrencyGuard.acquireLease({ userId });
    expect(lease3.allowed).toBe(false);
    expect(lease3.retryAfterSeconds).toBeDefined();
    expect(lease3.reason).toContain('User');

    // Release lease1
    await lease1.release();

    // Now a new lease should be allowed
    const lease4 = await concurrencyGuard.acquireLease({ userId });
    expect(lease4.allowed).toBe(true);

    // Clean up
    await lease2.release();
    await lease4.release();
  });

  it('tracks share link concurrency independently', async () => {
    const shareId = 'share-concurrency-' + Date.now();

    const l1 = await concurrencyGuard.acquireLease({ shareId });
    const l2 = await concurrencyGuard.acquireLease({ shareId });
    const l3 = await concurrencyGuard.acquireLease({ shareId });

    expect(l1.allowed).toBe(true);
    expect(l2.allowed).toBe(true);
    expect(l3.allowed).toBe(false);
    expect(l3.reason).toContain('Share Link');

    await l1.release();
    await l2.release();
  });
});
