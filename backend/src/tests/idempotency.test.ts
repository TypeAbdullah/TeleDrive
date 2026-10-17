import { describe, it, expect, vi } from 'vitest';
import { idempotencyGuard } from '../infrastructure/upload/idempotency.js';

function createMockReqRes(headers: Record<string, string> = {}) {
  const req: any = {
    headers: { ...headers },
    authUser: { id: 'user-id-123' },
  };

  const res: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: null as any,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    setHeader(key: string, val: string) {
      this.headers[key.toLowerCase()] = val;
    },
    json(data: any) {
      this.body = data;
      return this;
    },
  };

  const next = vi.fn();

  return { req, res, next };
}

describe('IdempotencyGuard Middleware', () => {
  it('calls next() without modifications when Idempotency-Key is not set', async () => {
    const middleware = idempotencyGuard();
    const { req, res, next } = createMockReqRes();

    await middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.headers['x-idempotent-replay']).toBeUndefined();
  });

  it('rejects invalid Idempotency-Key format (< 8 chars)', async () => {
    const middleware = idempotencyGuard();
    const { req, res, next } = createMockReqRes({ 'idempotency-key': 'short' });

    await expect(middleware(req, res, next)).rejects.toThrow('Invalid Idempotency-Key header format');
  });

  it('records response and replays it on subsequent identical requests', async () => {
    const middleware = idempotencyGuard();
    const key = 'test-idemp-12345678';

    // 1st request: in-progress -> complete
    const { req: req1, res: res1, next: next1 } = createMockReqRes({ 'idempotency-key': key });
    await middleware(req1, res1, next1);
    expect(next1).toHaveBeenCalledTimes(1);

    // Simulate route handler sending 201 response
    res1.status(201).json({ createdFileId: 'file-xyz' });
    expect(res1.body).toEqual({ createdFileId: 'file-xyz' });

    // 2nd request with same key
    const { req: req2, res: res2, next: next2 } = createMockReqRes({ 'idempotency-key': key });
    await middleware(req2, res2, next2);

    // Next should NOT be called on 2nd request because it replayed cached response!
    expect(next2).not.toHaveBeenCalled();
    expect(res2.statusCode).toBe(201);
    expect(res2.body).toEqual({ createdFileId: 'file-xyz' });
    expect(res2.headers['x-idempotent-replay']).toBe('true');
  });
});
