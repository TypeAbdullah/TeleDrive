import { PassThrough } from 'stream';
import { createModuleLogger } from '../../shared/logger.js';
import { ITelegramClientAdapter } from './client.js';

const log = createModuleLogger('parallel-range');

export interface ParallelRangeOptions {
  fileId: string;
  messageId: number;
  totalSize: number;
  rangeStart: number;
  rangeEnd: number;
  partSize?: number;
  maxConcurrency?: number;
  client: ITelegramClientAdapter;
  abortSignal?: AbortSignal;
}

/**
 * Safe, memory-bounded parallel range retrieval.
 * Emits ordered chunks through a PassThrough stream while fetching up to `maxConcurrency`
 * sub-ranges concurrently. Cancels immediately if client aborts.
 */
export function createParallelRangeStream(options: ParallelRangeOptions): NodeJS.ReadableStream {
  const output = new PassThrough();
  const partSize = options.partSize ?? 2 * 1024 * 1024; // 2MB chunk window
  const maxConcurrency = Math.min(4, Math.max(1, options.maxConcurrency ?? 2));

  const start = options.rangeStart;
  const end = options.rangeEnd;

  // Split range into sub-ranges
  const subRanges: { index: number; start: number; end: number }[] = [];
  let curr = start;
  let idx = 0;
  while (curr <= end) {
    const chunkEnd = Math.min(curr + partSize - 1, end);
    subRanges.push({ index: idx++, start: curr, end: chunkEnd });
    curr = chunkEnd + 1;
  }

  let isDestroyed = false;
  let nextIndexToEmit = 0;
  const readyBuffers = new Map<number, Buffer>();
  let activeWorkers = 0;
  let rangeIndex = 0;

  function cleanup() {
    isDestroyed = true;
    readyBuffers.clear();
  }

  if (options.abortSignal) {
    options.abortSignal.addEventListener('abort', () => {
      cleanup();
      output.destroy(new Error('Parallel transfer aborted by client'));
    });
  }

  output.on('close', cleanup);

  async function fetchSubRange(range: { index: number; start: number; end: number }): Promise<void> {
    if (isDestroyed) return;

    try {
      const stream = await options.client.downloadStream(options.fileId, options.messageId, {
        start: range.start,
        end: range.end,
      });

      const chunks: Buffer[] = [];
      for await (const chunk of stream as any) {
        if (isDestroyed) break;
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }

      if (isDestroyed) return;

      const combined = Buffer.concat(chunks);
      readyBuffers.set(range.index, combined);
      drainBufferedChunks();
    } catch (err: any) {
      if (!isDestroyed) {
        log.warn({ range, err: err?.message }, 'Failed downloading sub-range in parallel');
        cleanup();
        output.destroy(err);
      }
    }
  }

  function drainBufferedChunks(): void {
    while (readyBuffers.has(nextIndexToEmit)) {
      if (isDestroyed) break;
      const buf = readyBuffers.get(nextIndexToEmit)!;
      readyBuffers.delete(nextIndexToEmit);
      nextIndexToEmit++;

      const ok = output.write(buf);
      if (!ok) {
        // Handle backpressure
        output.once('drain', () => {
          drainBufferedChunks();
          scheduleNext();
        });
        return;
      }
    }

    if (nextIndexToEmit === subRanges.length && !isDestroyed) {
      output.end();
      cleanup();
    } else {
      scheduleNext();
    }
  }

  function scheduleNext(): void {
    if (isDestroyed) return;

    while (activeWorkers < maxConcurrency && rangeIndex < subRanges.length) {
      const task = subRanges[rangeIndex++];
      activeWorkers++;
      fetchSubRange(task).finally(() => {
        activeWorkers--;
        scheduleNext();
      });
    }
  }

  // Start initial worker batch
  setImmediate(scheduleNext);

  return output;
}
