import { EventEmitter } from 'events';
import { createModuleLogger } from '../../shared/logger.js';
import { accountPool } from './pool.js';
import { ITelegramClientAdapter } from './client.js';

const log = createModuleLogger('transfer-scheduler');

export type TransferCategory = 'upload' | 'download' | 'metadata' | 'maintenance';

export enum TaskPriority {
  BACKGROUND = 1,
  NORMAL = 2,
  HIGH = 3,
  CRITICAL = 4,
}

export interface ScheduledTask<T = any> {
  id: string;
  category: TransferCategory;
  priority: TaskPriority;
  userId?: string;
  apiKeyId?: string;
  accountId?: string;
  enqueuedAt: number;
  retriesRemaining: number;
  isIdempotent: boolean;
  abortSignal?: AbortSignal;
  execute: (client: ITelegramClientAdapter, signal?: AbortSignal) => Promise<T>;
  resolve: (value: T) => void;
  reject: (err: any) => void;
}

export interface SchedulerMetrics {
  activeTotal: number;
  activeUploads: number;
  activeDownloads: number;
  activeMetadata: number;
  queueDepth: number;
  avgQueueWaitMs: number;
  totalCompleted: number;
  totalFailed: number;
  totalRejected: number;
}

export interface SchedulerOptions {
  maxGlobalConcurrency?: number;
  maxUploadConcurrency?: number;
  maxDownloadConcurrency?: number;
  maxQueueDepth?: number;
  defaultMaxRetries?: number;
}

export class TransferScheduler extends EventEmitter {
  private queue: ScheduledTask[] = [];
  private activeTasks: Map<string, ScheduledTask> = new Map();
  private userActiveCount: Map<string, number> = new Map();

  private maxGlobalConcurrency: number;
  private maxUploadConcurrency: number;
  private maxDownloadConcurrency: number;
  private maxQueueDepth: number;
  private defaultMaxRetries: number;

  private isDraining = false;
  private totalCompleted = 0;
  private totalFailed = 0;
  private totalRejected = 0;
  private totalWaitTimeMs = 0;
  private measuredWaitsCount = 0;

  constructor(options: SchedulerOptions = {}) {
    super();
    this.maxGlobalConcurrency = options.maxGlobalConcurrency ?? 40;
    this.maxUploadConcurrency = options.maxUploadConcurrency ?? 15;
    this.maxDownloadConcurrency = options.maxDownloadConcurrency ?? 25;
    this.maxQueueDepth = options.maxQueueDepth ?? 500;
    this.defaultMaxRetries = options.defaultMaxRetries ?? 3;
  }

  /**
   * Schedules a task with priority, bounded queue limits, and cancellation handling.
   */
  async schedule<T>(params: {
    id: string;
    category: TransferCategory;
    priority?: TaskPriority;
    userId?: string;
    apiKeyId?: string;
    preferredAccountId?: string;
    isIdempotent?: boolean;
    abortSignal?: AbortSignal;
    retries?: number;
    execute: (client: ITelegramClientAdapter, signal?: AbortSignal) => Promise<T>;
  }): Promise<T> {
    if (this.isDraining) {
      throw new Error('Scheduler is draining; no new transfers accepted');
    }

    if (this.queue.length >= this.maxQueueDepth) {
      this.totalRejected++;
      throw new Error(`Transfer queue is at maximum capacity (${this.maxQueueDepth})`);
    }

    if (params.abortSignal?.aborted) {
      throw new Error('Transfer aborted before execution');
    }

    return new Promise<T>((resolve, reject) => {
      const task: ScheduledTask<T> = {
        id: params.id,
        category: params.category,
        priority: params.priority ?? TaskPriority.NORMAL,
        userId: params.userId,
        apiKeyId: params.apiKeyId,
        accountId: params.preferredAccountId,
        enqueuedAt: Date.now(),
        retriesRemaining: params.isIdempotent ? (params.retries ?? this.defaultMaxRetries) : 0,
        isIdempotent: params.isIdempotent ?? false,
        abortSignal: params.abortSignal,
        execute: params.execute,
        resolve,
        reject,
      };

      if (params.abortSignal) {
        params.abortSignal.addEventListener(
          'abort',
          () => {
            this.cancelTask(task.id, new Error('Client aborted transfer'));
          },
          { once: true }
        );
      }

      this.enqueueTask(task);
      this.processNext();
    });
  }

  private enqueueTask(task: ScheduledTask): void {
    // Insert in descending order of priority (higher priority first)
    const index = this.queue.findIndex(t => t.priority < task.priority);
    if (index === -1) {
      this.queue.push(task);
    } else {
      this.queue.splice(index, 0, task);
    }
  }

  private processNext(): void {
    if (this.isDraining && this.activeTasks.size === 0 && this.queue.length === 0) {
      this.emit('drained');
      return;
    }

    if (this.activeTasks.size >= this.maxGlobalConcurrency) {
      return; // Global limit reached
    }

    // Check category concurrency limits
    let activeUploads = 0;
    let activeDownloads = 0;
    for (const t of this.activeTasks.values()) {
      if (t.category === 'upload') activeUploads++;
      if (t.category === 'download') activeDownloads++;
    }

    for (let i = 0; i < this.queue.length; i++) {
      const candidate = this.queue[i];

      // Check category-specific limits
      if (candidate.category === 'upload' && activeUploads >= this.maxUploadConcurrency) {
        continue;
      }
      if (candidate.category === 'download' && activeDownloads >= this.maxDownloadConcurrency) {
        continue;
      }

      // Check user concurrency limit (max 8 per user)
      if (candidate.userId) {
        const userCount = this.userActiveCount.get(candidate.userId) || 0;
        if (userCount >= 8) {
          continue; // Prevent single user starvation
        }
      }

      // Select client from pool
      const client = candidate.accountId
        ? accountPool.getClient(candidate.accountId)
        : accountPool.getBestClient(candidate.category === 'upload' ? 'upload' : 'download');

      if (!client || !client.isReady) {
        continue; // No suitable client ready for this candidate right now
      }

      // Found an executable candidate!
      this.queue.splice(i, 1);
      this.executeTask(candidate, client);
      break;
    }
  }

  private async executeTask(task: ScheduledTask, client: ITelegramClientAdapter): Promise<void> {
    const queueWait = Date.now() - task.enqueuedAt;
    this.totalWaitTimeMs += queueWait;
    this.measuredWaitsCount++;

    this.activeTasks.set(task.id, task);
    if (task.userId) {
      const current = this.userActiveCount.get(task.userId) || 0;
      this.userActiveCount.set(task.userId, current + 1);
    }

    const opType = task.category === 'upload' ? 'upload' : 'download';
    accountPool.recordOperationStart(client.accountId, opType);

    const startTime = Date.now();
    try {
      const result = await task.execute(client, task.abortSignal);
      const durationMs = Date.now() - startTime;
      await accountPool.recordSuccess(client.accountId, 0, durationMs);
      this.totalCompleted++;
      task.resolve(result);
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      await accountPool.recordError(client.accountId, err, durationMs);

      // Error classification
      const isAbort = task.abortSignal?.aborted || err?.name === 'AbortError' || err?.message?.includes('aborted');
      const isAuthError = err?.message?.includes('AUTH_KEY') || err?.message?.includes('UNAUTHORIZED');
      const isFloodWait = err?.message?.includes('FLOOD_WAIT');

      if (!isAbort && !isAuthError && !isFloodWait && task.isIdempotent && task.retriesRemaining > 0) {
        task.retriesRemaining--;
        log.warn(
          { taskId: task.id, retriesRemaining: task.retriesRemaining, err: err?.message },
          'Retrying idempotent transfer task with backoff'
        );

        // Exponential backoff with jitter
        const backoffMs = Math.min(5000, 200 * Math.pow(2, 3 - task.retriesRemaining) + Math.random() * 500);
        setTimeout(() => {
          this.enqueueTask(task);
          this.processNext();
        }, backoffMs);
      } else {
        this.totalFailed++;
        task.reject(err);
      }
    } finally {
      accountPool.recordOperationEnd(client.accountId, opType);
      this.activeTasks.delete(task.id);
      if (task.userId) {
        const current = this.userActiveCount.get(task.userId) || 1;
        this.userActiveCount.set(task.userId, Math.max(0, current - 1));
      }

      // Schedule next available task
      setImmediate(() => this.processNext());
    }
  }

  cancelTask(taskId: string, reason?: Error): boolean {
    const queueIndex = this.queue.findIndex(t => t.id === taskId);
    if (queueIndex !== -1) {
      const [task] = this.queue.splice(queueIndex, 1);
      task.reject(reason || new Error('Task cancelled while queued'));
      return true;
    }

    const active = this.activeTasks.get(taskId);
    if (active) {
      // Running task cancellation handled via abortSignal
      return true;
    }

    return false;
  }

  getMetrics(): SchedulerMetrics {
    let activeUploads = 0;
    let activeDownloads = 0;
    let activeMetadata = 0;

    for (const t of this.activeTasks.values()) {
      if (t.category === 'upload') activeUploads++;
      else if (t.category === 'download') activeDownloads++;
      else if (t.category === 'metadata') activeMetadata++;
    }

    const avgQueueWaitMs =
      this.measuredWaitsCount > 0 ? Math.round(this.totalWaitTimeMs / this.measuredWaitsCount) : 0;

    return {
      activeTotal: this.activeTasks.size,
      activeUploads,
      activeDownloads,
      activeMetadata,
      queueDepth: this.queue.length,
      avgQueueWaitMs,
      totalCompleted: this.totalCompleted,
      totalFailed: this.totalFailed,
      totalRejected: this.totalRejected,
    };
  }

  /**
   * Graceful drain: stops accepting work and waits for running transfers to complete
   */
  async drain(timeoutMs = 15000): Promise<void> {
    this.isDraining = true;
    log.info({ activeCount: this.activeTasks.size, queueDepth: this.queue.length }, 'Transfer scheduler draining...');

    // Clear remaining queued tasks with cancellation
    for (const task of this.queue) {
      task.reject(new Error('Server shutting down; transfer cancelled'));
    }
    this.queue = [];

    if (this.activeTasks.size === 0) {
      return;
    }

    return new Promise(resolve => {
      const timer = setTimeout(() => {
        log.warn({ remaining: this.activeTasks.size }, 'Transfer drain timeout reached; forcing shutdown');
        resolve();
      }, timeoutMs);

      this.once('drained', () => {
        clearTimeout(timer);
        log.info('All transfers drained cleanly');
        resolve();
      });
    });
  }
}

export const transferScheduler = new TransferScheduler();
