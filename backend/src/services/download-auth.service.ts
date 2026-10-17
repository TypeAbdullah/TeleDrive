import crypto from 'crypto';
import { nanoid } from 'nanoid';
import { getConfig } from '../config/index.js';
import { getRedisClient, isRedisAvailable } from '../infrastructure/redis/connection.js';
import { createModuleLogger } from '../shared/logger.js';

const log = createModuleLogger('download-auth');

export interface DownloadTokenPayload {
  fid: string;                              // File ID
  fn: string;                               // File Name (RFC-safe)
  sz: number;                               // Size in bytes
  mt: string;                               // MIME type
  uid: string;                              // User ID or 'anonymous'
  sid?: string;                             // Share link ID
  kid?: string;                             // API key ID
  scp: 'read' | 'download';                 // Permission scope
  pol: 'public' | 'private' | 'revocable';  // Cache and access policy
  cs?: string;                              // Checksum / ETag
  jti: string;                              // Unique token ID for replay / revocation
  iat: number;                              // Issued at (unix seconds)
  exp: number;                              // Expiration timestamp (unix seconds)
}

export interface TokenVerificationResult {
  valid: boolean;
  payload?: DownloadTokenPayload;
  error?: string;
  code?: 'EXPIRED' | 'INVALID_SIGNATURE' | 'MALFORMED' | 'REVOKED';
}

function base64UrlEncode(data: string | Buffer): string {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
  return buf.toString('base64url');
}

function base64UrlDecode(str: string): string {
  return Buffer.from(str, 'base64url').toString('utf8');
}

function computeHmac(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('base64url');
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// In-memory revocation cache fallback when Redis is not running
const inMemoryRevokedTokens = new Map<string, number>();

// Clean up expired in-memory revocation entries every 5 minutes
setInterval(() => {
  const now = Math.floor(Date.now() / 1000);
  for (const [jti, exp] of inMemoryRevokedTokens.entries()) {
    if (exp <= now) {
      inMemoryRevokedTokens.delete(jti);
    }
  }
}, 5 * 60 * 1000).unref();

export class DownloadAuthService {
  /**
   * Generates a cryptographically signed download authorization token.
   */
  generateToken(params: {
    fileId: string;
    fileName: string;
    size: number;
    mimeType?: string;
    userId: string;
    shareId?: string;
    apiKeyId?: string;
    scope?: 'read' | 'download';
    policy?: 'public' | 'private' | 'revocable';
    checksum?: string;
    expiresInSeconds?: number;
  }): { token: string; expiresAt: Date; payload: DownloadTokenPayload } {
    const config = getConfig();
    const now = Math.floor(Date.now() / 1000);
    const ttl = params.expiresInSeconds || config.DOWNLOAD_TOKEN_TTL_SECONDS;
    const exp = now + ttl;
    const expiresAt = new Date(exp * 1000);

    const payload: DownloadTokenPayload = {
      fid: params.fileId,
      fn: params.fileName,
      sz: params.size,
      mt: params.mimeType || 'application/octet-stream',
      uid: params.userId,
      sid: params.shareId,
      kid: params.apiKeyId,
      scp: params.scope || 'download',
      pol: params.policy || 'private',
      cs: params.checksum,
      jti: nanoid(18),
      iat: now,
      exp,
    };

    const header = { alg: 'HS256', typ: 'TDL', kid: 'v1' };
    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    const signature = computeHmac(signingInput, config.DOWNLOAD_GATEWAY_SECRET);
    const token = `${signingInput}.${signature}`;

    return { token, expiresAt, payload };
  }

  /**
   * Builds the complete download URL pointing to the Cloudflare Worker Gateway.
   */
  buildDownloadUrl(token: string): string {
    const config = getConfig();
    const baseUrl = config.DOWNLOAD_GATEWAY_URL.replace(/\/+$/, '');
    return `${baseUrl}/d/${token}`;
  }

  /**
   * Validates a signed download token. Supports key rotation and revocation checking.
   */
  async verifyToken(token: string): Promise<TokenVerificationResult> {
    if (!token || typeof token !== 'string') {
      return { valid: false, error: 'Token is missing or not a string', code: 'MALFORMED' };
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Malformed token structure', code: 'MALFORMED' };
    }

    const [encodedHeader, encodedPayload, signature] = parts;
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    const config = getConfig();
    const primarySecret = config.DOWNLOAD_GATEWAY_SECRET;
    const rotationSecret = config.DOWNLOAD_GATEWAY_ROTATION_SECRET;

    // Verify signature with primary secret
    let signatureMatches = timingSafeEqualStr(computeHmac(signingInput, primarySecret), signature);

    // If primary secret fails, check rotation secret if configured
    if (!signatureMatches && rotationSecret) {
      signatureMatches = timingSafeEqualStr(computeHmac(signingInput, rotationSecret), signature);
    }

    if (!signatureMatches) {
      log.warn({ tokenPrefix: token.substring(0, 10) }, 'Invalid download token signature');
      return { valid: false, error: 'Invalid token signature', code: 'INVALID_SIGNATURE' };
    }

    // Decode and validate payload
    let payload: DownloadTokenPayload;
    try {
      payload = JSON.parse(base64UrlDecode(encodedPayload));
    } catch {
      return { valid: false, error: 'Malformed token payload', code: 'MALFORMED' };
    }

    // Expiration check
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) {
      return { valid: false, error: 'Download token has expired', code: 'EXPIRED' };
    }

    // Revocation check
    const isRevoked = await this.isTokenRevoked(payload.jti);
    if (isRevoked) {
      return { valid: false, error: 'Download token has been revoked', code: 'REVOKED' };
    }

    return { valid: true, payload };
  }

  /**
   * Revokes a specific token by JTI until its expiration.
   */
  async revokeToken(jti: string, expSeconds: number): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const ttl = Math.max(1, expSeconds - now);

    if (isRedisAvailable()) {
      const redis = getRedisClient();
      if (redis) {
        await redis.setex(`td:revoked:${jti}`, ttl, '1');
        log.info({ jti, ttl }, 'Revoked download token in Redis');
        return;
      }
    }

    inMemoryRevokedTokens.set(jti, expSeconds);
    log.info({ jti, ttl }, 'Revoked download token in memory');
  }

  /**
   * Checks whether a token has been revoked.
   */
  async isTokenRevoked(jti: string): Promise<boolean> {
    if (isRedisAvailable()) {
      const redis = getRedisClient();
      if (redis) {
        const result = await redis.get(`td:revoked:${jti}`);
        return result === '1';
      }
    }

    const exp = inMemoryRevokedTokens.get(jti);
    if (exp) {
      const now = Math.floor(Date.now() / 1000);
      if (exp > now) return true;
      inMemoryRevokedTokens.delete(jti);
    }
    return false;
  }
}

export const downloadAuthService = new DownloadAuthService();
