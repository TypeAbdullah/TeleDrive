import { describe, it, expect, beforeEach } from 'vitest';
import workerHandler from '../../../workers/worker.js';
import { downloadAuthService } from '../services/download-auth.service.js';
import { loadConfig } from '../config/env.js';

describe('Cloudflare Worker Gateway (worker.js)', () => {
  const MOCK_ENV = {
    ORIGIN_URL: 'http://localhost:3000',
    DOWNLOAD_GATEWAY_SECRET: 'primary-download-secret-32-chars-long!',
    DOWNLOAD_GATEWAY_ROTATION_SECRET: 'rotation-download-secret-32-chars-long!',
    INTERNAL_STREAM_SECRET: 'internal-secret-32-chars-long!',
    ENVIRONMENT: 'test',
    ENABLE_EDGE_CACHE: 'false',
  };

  beforeEach(() => {
    process.env.BETTER_AUTH_SECRET = 'test-secret-at-least-32-chars-long-for-testing';
    process.env.DISCORD_CLIENT_ID = 'test-discord-id';
    process.env.DISCORD_CLIENT_SECRET = 'test-discord-secret';
    process.env.MONGODB_URI = 'mongodb://localhost:27017/teledrive-test';
    process.env.DOWNLOAD_GATEWAY_SECRET = MOCK_ENV.DOWNLOAD_GATEWAY_SECRET;
    loadConfig();
  });

  it('responds with 200 and healthy status on /health', async () => {
    const req = new Request('https://download.example.com/health', { method: 'GET' });
    const res = await workerHandler.fetch(req, MOCK_ENV, {} as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('healthy');
    expect(body.service).toBe('teledrive-download-gateway');
  });

  it('responds with 200 on /status and /metrics', async () => {
    const reqStatus = new Request('https://download.example.com/status', { method: 'GET' });
    const resStatus = await workerHandler.fetch(reqStatus, MOCK_ENV, {} as any);
    expect(resStatus.status).toBe(200);

    const reqMetrics = new Request('https://download.example.com/metrics', { method: 'GET' });
    const resMetrics = await workerHandler.fetch(reqMetrics, MOCK_ENV, {} as any);
    expect(resMetrics.status).toBe(200);
    const metrics = await resMetrics.json();
    expect(metrics.success).toBe(true);
    expect(metrics.metrics).toBeDefined();
  });

  it('rejects unauthenticated requests or invalid tokens on /d/:token with 401', async () => {
    const req = new Request('https://download.example.com/d/invalid.token.here', { method: 'GET' });
    const res = await workerHandler.fetch(req, MOCK_ENV, {} as any);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INVALID_SIGNATURE');
  });

  it('rejects expired tokens on /d/:token with 410', async () => {
    const { token } = downloadAuthService.generateToken({
      fileId: 'f-exp',
      fileName: 'old.zip',
      size: 5000,
      userId: 'u-1',
      expiresInSeconds: -10, // expired
    });

    const req = new Request(`https://download.example.com/d/${token}`, { method: 'GET' });
    const res = await workerHandler.fetch(req, MOCK_ENV, {} as any);

    expect(res.status).toBe(410);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('fulfills HEAD requests at edge without upstream fetch when token is valid', async () => {
    const { token } = downloadAuthService.generateToken({
      fileId: 'f-head-1',
      fileName: 'document.pdf',
      size: 1048576,
      mimeType: 'application/pdf',
      userId: 'u-1',
      expiresInSeconds: 600,
    });

    const req = new Request(`https://download.example.com/d/${token}`, { method: 'HEAD' });
    const res = await workerHandler.fetch(req, MOCK_ENV, {} as any);

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('content-length')).toBe('1048576');
    expect(res.headers.get('accept-ranges')).toBe('bytes');
    expect(res.headers.get('content-disposition')).toContain('filename="document.pdf"');
  });

  it('fulfills HEAD requests with Range header (206) at edge', async () => {
    const { token } = downloadAuthService.generateToken({
      fileId: 'f-head-range',
      fileName: 'video.mp4',
      size: 10000000,
      mimeType: 'video/mp4',
      userId: 'u-1',
      expiresInSeconds: 600,
    });

    const req = new Request(`https://download.example.com/d/${token}`, {
      method: 'HEAD',
      headers: { Range: 'bytes=0-1023' },
    });
    const res = await workerHandler.fetch(req, MOCK_ENV, {} as any);

    expect(res.status).toBe(206);
    expect(res.headers.get('content-range')).toBe('bytes 0-1023/10000000');
    expect(res.headers.get('content-length')).toBe('1024');
  });

  it('rejects invalid Range on HEAD/GET with 416 Range Not Satisfiable', async () => {
    const { token } = downloadAuthService.generateToken({
      fileId: 'f-range-err',
      fileName: 'small.txt',
      size: 100,
      userId: 'u-1',
      expiresInSeconds: 600,
    });

    const req = new Request(`https://download.example.com/d/${token}`, {
      method: 'GET',
      headers: { Range: 'bytes=500-1000' }, // Exceeds file size 100
    });
    const res = await workerHandler.fetch(req, MOCK_ENV, {} as any);

    expect(res.status).toBe(416);
    expect(res.headers.get('content-range')).toBe('bytes */100');
  });
});
