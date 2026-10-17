import { describe, it, expect } from 'vitest';
import { SingleFlightGroup, acquireLock } from '../infrastructure/coalesce/singleflight.js';

describe('SingleFlightGroup (Request Coalescing)', () => {
  it('coalesces identical concurrent asynchronous executions into one call', async () => {
    const group = new SingleFlightGroup();
    let executionCount = 0;

    const worker = async () => {
      return group.execute('file:meta:123', async () => {
        executionCount++;
        await new Promise(r => setTimeout(r, 50));
        return { fileId: '123', size: 1048576 };
      });
    };

    // Launch 5 concurrent calls
    const results = await Promise.all([worker(), worker(), worker(), worker(), worker()]);

    expect(executionCount).toBe(1);
    for (const res of results) {
      expect(res.fileId).toBe('123');
      expect(res.size).toBe(1048576);
    }
    expect(group.activeKeysCount).toBe(0);
  });

  it('runs different keys independently', async () => {
    const group = new SingleFlightGroup();
    let countA = 0;
    let countB = 0;

    const [resA, resB] = await Promise.all([
      group.execute('key-A', async () => {
        countA++;
        return 'result-A';
      }),
      group.execute('key-B', async () => {
        countB++;
        return 'result-B';
      }),
    ]);

    expect(countA).toBe(1);
    expect(countB).toBe(1);
    expect(resA).toBe('result-A');
    expect(resB).toBe('result-B');
  });

  it('propagates errors to all concurrent waiters', async () => {
    const group = new SingleFlightGroup();

    const faultyTask = () =>
      group.execute('failing-key', async () => {
        await new Promise(r => setTimeout(r, 20));
        throw new Error('Telegram RPC Timeout');
      });

    await expect(Promise.all([faultyTask(), faultyTask()])).rejects.toThrow('Telegram RPC Timeout');
    expect(group.activeKeysCount).toBe(0);
  });
});

describe('DistributedLock (acquireLock & safe release)', () => {
  it('acquires and safely releases in-memory lock', async () => {
    const lock1 = await acquireLock('resource:user-1:upload', 5000);
    expect(lock1).not.toBeNull();
    expect(lock1?.lockId).toBeDefined();

    // Secondary attempt for same resource fails while held
    const lock2 = await acquireLock('resource:user-1:upload', 5000);
    expect(lock2).toBeNull();

    // Release lock1
    const released = await lock1!.release();
    expect(released).toBe(true);

    // Now lock3 can be acquired
    const lock3 = await acquireLock('resource:user-1:upload', 5000);
    expect(lock3).not.toBeNull();
    await lock3!.release();
  });
});
