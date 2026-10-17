import { describe, it, expect, beforeEach } from 'vitest';
import { TransferScheduler, TaskPriority } from '../infrastructure/telegram/transfer-scheduler.js';
import { accountPool } from '../infrastructure/telegram/pool.js';

import { loadConfig } from '../config/env.js';

describe('TransferScheduler', () => {
  let scheduler: TransferScheduler;

  beforeEach(async () => {
    process.env.BETTER_AUTH_SECRET = 'test-secret-at-least-32-chars-long-for-testing';
    process.env.DISCORD_CLIENT_ID = 'test-discord-id';
    process.env.DISCORD_CLIENT_SECRET = 'test-discord-secret';
    process.env.MONGODB_URI = 'mongodb://localhost:27017/teledrive-test';
    loadConfig();

    await accountPool.initialize();
    scheduler = new TransferScheduler({
      maxGlobalConcurrency: 2,
      maxUploadConcurrency: 2,
      maxDownloadConcurrency: 2,
      maxQueueDepth: 10,
      defaultMaxRetries: 2,
    });
  });

  it('schedules and executes a download task', async () => {
    const result = await scheduler.schedule({
      id: 'task-1',
      category: 'download',
      execute: async () => 'downloaded-content',
    });

    expect(result).toBe('downloaded-content');
    const metrics = scheduler.getMetrics();
    expect(metrics.totalCompleted).toBe(1);
    expect(metrics.activeTotal).toBe(0);
  });

  it('orders tasks by priority', async () => {
    const order: string[] = [];

    // Pause executions with a blocking task
    let releaseBlocker: () => void;
    const blockerPromise = new Promise<void>(r => {
      releaseBlocker = r;
    });

    // Fill both concurrency slots
    const task1 = scheduler.schedule({
      id: 'blocker-1',
      category: 'download',
      execute: async () => blockerPromise,
    });

    const task2 = scheduler.schedule({
      id: 'blocker-2',
      category: 'download',
      execute: async () => blockerPromise,
    });

    // Queue low priority first, then high priority
    const lowTask = scheduler.schedule({
      id: 'low-prio',
      category: 'download',
      priority: TaskPriority.BACKGROUND,
      execute: async () => {
        order.push('low');
      },
    });

    const highTask = scheduler.schedule({
      id: 'high-prio',
      category: 'download',
      priority: TaskPriority.CRITICAL,
      execute: async () => {
        order.push('high');
      },
    });

    // Release blockers
    releaseBlocker!();
    await Promise.all([task1, task2, lowTask, highTask]);

    // High priority must execute before low priority
    expect(order).toEqual(['high', 'low']);
  });

  it('cancels queued tasks cleanly when AbortSignal triggers', async () => {
    // Fill slots
    let releaseBlocker: () => void;
    const blocker = new Promise<void>(r => {
      releaseBlocker = r;
    });

    const t1 = scheduler.schedule({ id: 'b1', category: 'download', execute: () => blocker });
    const t2 = scheduler.schedule({ id: 'b2', category: 'download', execute: () => blocker });

    const controller = new AbortController();
    const queuedTask = scheduler.schedule({
      id: 'will-cancel',
      category: 'download',
      abortSignal: controller.signal,
      execute: async () => 'never-runs',
    });

    // Trigger abort while queued
    controller.abort();

    await expect(queuedTask).rejects.toThrow('Client aborted transfer');

    releaseBlocker!();
    await Promise.all([t1, t2]);
  });

  it('retries idempotent tasks on transient error', async () => {
    let attempts = 0;

    const result = await scheduler.schedule({
      id: 'flaky-task',
      category: 'download',
      isIdempotent: true,
      retries: 2,
      execute: async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Transient connection reset');
        }
        return 'recovered-after-retry';
      },
    });

    expect(result).toBe('recovered-after-retry');
    expect(attempts).toBe(2);
  });
});
