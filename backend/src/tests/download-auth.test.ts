import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { downloadAuthService, DownloadTokenPayload } from '../services/download-auth.service.js';
import { loadConfig } from '../config/env.js';

describe('DownloadAuthService — Cryptographic Token Verification', () => {
  beforeEach(() => {
    // Ensure test configuration is loaded
    process.env.BETTER_AUTH_SECRET = 'test-secret-at-least-32-chars-long-for-testing';
    process.env.DISCORD_CLIENT_ID = 'test-discord-id';
    process.env.DISCORD_CLIENT_SECRET = 'test-discord-secret';
    process.env.MONGODB_URI = 'mongodb://localhost:27017/teledrive-test';
    process.env.DOWNLOAD_GATEWAY_SECRET = 'primary-download-secret-32-chars-long!';
    process.env.DOWNLOAD_GATEWAY_ROTATION_SECRET = 'rotation-download-secret-32-chars-long!';
    loadConfig();
  });

  it('generates and verifies a valid download token', async () => {
    const { token, expiresAt, payload } = downloadAuthService.generateToken({
      fileId: 'file-12345',
      fileName: 'report.pdf',
      size: 1048576,
      mimeType: 'application/pdf',
      userId: 'user-999',
      scope: 'download',
      policy: 'private',
      checksum: 'sha256-abcdef',
      expiresInSeconds: 300,
    });

    expect(token).toBeDefined();
    expect(token.split('.')).toHaveLength(3);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(payload.fid).toBe('file-12345');
    expect(payload.fn).toBe('report.pdf');

    const result = await downloadAuthService.verifyToken(token);
    expect(result.valid).toBe(true);
    expect(result.payload).toBeDefined();
    expect(result.payload?.fid).toBe('file-12345');
    expect(result.payload?.sz).toBe(1048576);
    expect(result.payload?.scp).toBe('download');
    expect(result.payload?.pol).toBe('private');
  });

  it('builds a proper Cloudflare download gateway URL', () => {
    const { token } = downloadAuthService.generateToken({
      fileId: 'file-abc',
      fileName: 'photo.jpg',
      size: 5000,
      userId: 'user-1',
    });

    const url = downloadAuthService.buildDownloadUrl(token);
    expect(url).toContain('/d/');
    expect(url).toContain(token);
  });

  it('rejects tampered tokens with INVALID_SIGNATURE', async () => {
    const { token } = downloadAuthService.generateToken({
      fileId: 'file-sensitive',
      fileName: 'secrets.txt',
      size: 2048,
      userId: 'user-admin',
    });

    const parts = token.split('.');
    // Tamper with payload (e.g. change file id to something else)
    const tamperedPayload = Buffer.from(
      JSON.stringify({ fid: 'file-tampered', sz: 9999, exp: Math.floor(Date.now() / 1000) + 3600 })
    ).toString('base64url');

    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

    const result = await downloadAuthService.verifyToken(tamperedToken);
    expect(result.valid).toBe(false);
    expect(result.code).toBe('INVALID_SIGNATURE');
  });

  it('rejects expired tokens with EXPIRED', async () => {
    // Generate a token that expired 10 seconds ago
    const { token } = downloadAuthService.generateToken({
      fileId: 'file-old',
      fileName: 'archive.tar',
      size: 100000,
      userId: 'user-1',
      expiresInSeconds: -10, // already expired
    });

    const result = await downloadAuthService.verifyToken(token);
    expect(result.valid).toBe(false);
    expect(result.code).toBe('EXPIRED');
  });

  it('rejects malformed tokens with MALFORMED', async () => {
    const result1 = await downloadAuthService.verifyToken('not-a-token');
    expect(result1.valid).toBe(false);
    expect(result1.code).toBe('MALFORMED');

    const result2 = await downloadAuthService.verifyToken('header.payload');
    expect(result2.valid).toBe(false);
    expect(result2.code).toBe('MALFORMED');

    const result3 = await downloadAuthService.verifyToken('');
    expect(result3.valid).toBe(false);
    expect(result3.code).toBe('MALFORMED');
  });

  it('supports zero-downtime key rotation via rotation secret', async () => {
    // Temporarily set active secret to the rotation secret to sign
    const originalSecret = process.env.DOWNLOAD_GATEWAY_SECRET;
    process.env.DOWNLOAD_GATEWAY_SECRET = process.env.DOWNLOAD_GATEWAY_ROTATION_SECRET;

    const { token } = downloadAuthService.generateToken({
      fileId: 'file-rotated',
      fileName: 'data.csv',
      size: 4000,
      userId: 'user-rot',
      expiresInSeconds: 300,
    });

    // Restore primary secret
    process.env.DOWNLOAD_GATEWAY_SECRET = originalSecret;

    // Token was signed with rotation secret; primary verification will fail, but rotation secret succeeds!
    const result = await downloadAuthService.verifyToken(token);
    expect(result.valid).toBe(true);
    expect(result.payload?.fid).toBe('file-rotated');
  });

  it('supports token revocation by JTI', async () => {
    const { token, payload } = downloadAuthService.generateToken({
      fileId: 'file-revokable',
      fileName: 'doc.pdf',
      size: 1234,
      userId: 'user-rev',
      expiresInSeconds: 300,
    });

    // Before revocation: valid
    const beforeResult = await downloadAuthService.verifyToken(token);
    expect(beforeResult.valid).toBe(true);

    // Revoke token
    await downloadAuthService.revokeToken(payload.jti, payload.exp);

    // After revocation: rejected
    const afterResult = await downloadAuthService.verifyToken(token);
    expect(afterResult.valid).toBe(false);
    expect(afterResult.code).toBe('REVOKED');
  });
});
