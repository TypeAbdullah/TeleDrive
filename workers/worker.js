/**
 * TeleDrive — Cloudflare Distributed Download Gateway
 * worker.js
 *
 * Self-contained, zero-dependency streaming download gateway for Cloudflare Workers.
 * Can be deployed via Wrangler or pasted directly into the Cloudflare Workers Dashboard.
 */

// ─── Environment Variables & Default Configuration ───────────────────────────
// These values can be configured via Cloudflare Dashboard (Variables & Secrets)
// or via Wrangler. If not provided in `env`, these fallback defaults are used.
const DEFAULT_ENV = {
  // Origin URL for the Node.js TeleDrive backend
  ORIGIN_URL: 'http://localhost:3000',

  // HMAC-SHA-256 secret for validating download authorization tokens
  // Must match DOWNLOAD_GATEWAY_SECRET in the backend .env
  DOWNLOAD_GATEWAY_SECRET: 'default-teledrive-download-secret-32-bytes!',

  // Optional secondary secret for zero-downtime key rotation
  DOWNLOAD_GATEWAY_ROTATION_SECRET: '',

  // Shared secret for Worker-to-Origin streaming requests
  // Must match INTERNAL_STREAM_SECRET in the backend .env
  INTERNAL_STREAM_SECRET: 'default-internal-stream-secret-32-chars!',

  // Environment mode: 'development', 'staging', or 'production'
  ENVIRONMENT: 'production',

  // Public Download Gateway URL (e.g. https://download.example.com)
  DOWNLOAD_GATEWAY_URL: 'http://localhost:8787',

  // Enable Cloudflare Edge Cache API for public immutable downloads ('true' | 'false')
  ENABLE_EDGE_CACHE: 'true',

  // Cache max-age in seconds for public immutable files (86400 = 24h, 604800 = 7d)
  DEFAULT_CACHE_MAX_AGE_SECONDS: '86400',

  // Edge sliding-window rate limit (requests per minute per client IP)
  RATE_LIMIT_PER_MINUTE: 120,
};

/**
 * Resolves configuration from the Worker runtime env or default fallbacks
 */
function resolveConfig(env = {}) {
  return {
    ORIGIN_URL: (env.ORIGIN_URL || DEFAULT_ENV.ORIGIN_URL).replace(/\/+$/, ''),
    DOWNLOAD_GATEWAY_SECRET: env.DOWNLOAD_GATEWAY_SECRET || DEFAULT_ENV.DOWNLOAD_GATEWAY_SECRET,
    DOWNLOAD_GATEWAY_ROTATION_SECRET: env.DOWNLOAD_GATEWAY_ROTATION_SECRET || DEFAULT_ENV.DOWNLOAD_GATEWAY_ROTATION_SECRET,
    INTERNAL_STREAM_SECRET: env.INTERNAL_STREAM_SECRET || DEFAULT_ENV.INTERNAL_STREAM_SECRET,
    ENVIRONMENT: env.ENVIRONMENT || DEFAULT_ENV.ENVIRONMENT,
    DOWNLOAD_GATEWAY_URL: (env.DOWNLOAD_GATEWAY_URL || DEFAULT_ENV.DOWNLOAD_GATEWAY_URL).replace(/\/+$/, ''),
    ENABLE_EDGE_CACHE: env.ENABLE_EDGE_CACHE !== undefined ? String(env.ENABLE_EDGE_CACHE) === 'true' : String(DEFAULT_ENV.ENABLE_EDGE_CACHE) === 'true',
    DEFAULT_CACHE_MAX_AGE_SECONDS: parseInt(String(env.DEFAULT_CACHE_MAX_AGE_SECONDS || DEFAULT_ENV.DEFAULT_CACHE_MAX_AGE_SECONDS), 10),
    RATE_LIMIT_PER_MINUTE: parseInt(String(env.RATE_LIMIT_PER_MINUTE || DEFAULT_ENV.RATE_LIMIT_PER_MINUTE), 10),
  };
}

// ── In-Memory Edge Metrics & Rate Limiting ────────────────────────────────────
const metrics = {
  activeStreams: 0,
  totalRequests: 0,
  completedRequests: 0,
  abortedRequests: 0,
  errorRequests: 0,
  rangeRequests: 0,
  cacheHits: 0,
  cacheMisses: 0,
  totalBytesDelivered: 0,
  startTime: Date.now(),
};

// Edge sliding-window rate limit cache: IP -> { count, resetTime }
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60000;

function checkEdgeRateLimit(clientIp, maxRequests) {
  const now = Date.now();
  const record = rateLimitMap.get(clientIp);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(clientIp, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  record.count++;
  if (record.count > maxRequests) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  return { allowed: true };
}

// ── Web Crypto Utility Functions ──────────────────────────────────────────────
function base64UrlDecodeToUint8Array(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function verifyHmacSignature(dataStr, signatureStr, secretStr) {
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secretStr),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const dataBytes = enc.encode(dataStr);
    const signatureBytes = base64UrlDecodeToUint8Array(signatureStr);

    return await crypto.subtle.verify('HMAC', key, signatureBytes, dataBytes);
  } catch {
    return false;
  }
}

async function verifyDownloadToken(token, primarySecret, rotationSecret) {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Token missing or invalid', status: 400, code: 'TOKEN_MISSING' };
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Malformed token structure', status: 400, code: 'TOKEN_MALFORMED' };
  }

  const [headerB64, payloadB64, signature] = parts;
  const signingInput = `${headerB64}.${payloadB64}`;

  // Primary secret verification
  let isValid = await verifyHmacSignature(signingInput, signature, primarySecret);

  // Rotation secret verification fallback
  if (!isValid && rotationSecret) {
    isValid = await verifyHmacSignature(signingInput, signature, rotationSecret);
  }

  if (!isValid) {
    return { valid: false, error: 'Invalid token signature', status: 401, code: 'INVALID_SIGNATURE' };
  }

  // Parse payload
  let payload;
  try {
    const payloadBytes = base64UrlDecodeToUint8Array(payloadB64);
    const jsonStr = new TextDecoder().decode(payloadBytes);
    payload = JSON.parse(jsonStr);
  } catch {
    return { valid: false, error: 'Malformed payload JSON', status: 400, code: 'TOKEN_MALFORMED' };
  }

  // Expiration check
  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp <= now) {
    return { valid: false, error: 'Download authorization expired', status: 410, code: 'TOKEN_EXPIRED' };
  }

  return { valid: true, payload };
}

// ── HTTP Range Handling ───────────────────────────────────────────────────────
function parseHttpRange(rangeHeader, fileSize) {
  if (!rangeHeader) {
    return { valid: true, isRange: false };
  }

  if (!rangeHeader.startsWith('bytes=')) {
    return { valid: false, isRange: true, error: 'Invalid range unit' };
  }

  const rangeSpec = rangeHeader.replace(/^bytes=/, '').trim();
  if (rangeSpec.includes(',')) {
    return { valid: false, isRange: true, error: 'Multipart ranges not supported' };
  }

  const parts = rangeSpec.split('-');
  if (parts.length !== 2) {
    return { valid: false, isRange: true, error: 'Invalid range syntax' };
  }

  const startStr = parts[0].trim();
  const endStr = parts[1].trim();

  let start;
  let end;

  if (startStr === '' && endStr !== '') {
    // Suffix range: bytes=-500 (last 500 bytes)
    const suffix = parseInt(endStr, 10);
    if (isNaN(suffix) || suffix <= 0) {
      return { valid: false, isRange: true, error: 'Invalid suffix range length' };
    }
    start = Math.max(0, fileSize - suffix);
    end = fileSize - 1;
  } else if (startStr !== '' && endStr === '') {
    // Open range: bytes=500- (from 500 to EOF)
    start = parseInt(startStr, 10);
    end = fileSize - 1;
  } else if (startStr !== '' && endStr !== '') {
    start = parseInt(startStr, 10);
    end = parseInt(endStr, 10);
  } else {
    return { valid: false, isRange: true, error: 'Empty range' };
  }

  if (isNaN(start) || isNaN(end) || start < 0 || end >= fileSize || start > end) {
    return { valid: false, isRange: true, error: 'Range not satisfiable' };
  }

  return {
    valid: true,
    isRange: true,
    range: {
      start,
      end,
      chunkSize: end - start + 1,
    },
  };
}

// ── Safe Content-Disposition Formatter ────────────────────────────────────────
function formatSafeContentDisposition(filename, dispositionType = 'inline') {
  const safeAscii = filename
    .replace(/[\r\n\0]/g, '')
    .replace(/[\\"]/g, '_')
    .replace(/[^\x20-\x7E]/g, '_');

  const encodedRfc5987 = encodeURIComponent(filename).replace(/['()]/g, escape);
  return `${dispositionType}; filename="${safeAscii}"; filename*=UTF-8''${encodedRfc5987}`;
}

// ── JSON Error Helper ─────────────────────────────────────────────────────────
function jsonError(status, code, message, requestId, extraHeaders = {}) {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'X-Request-ID': requestId,
    ...extraHeaders,
  });

  return new Response(
    JSON.stringify({
      success: false,
      error: { code, message, requestId },
    }),
    { status, headers }
  );
}

// ── Main Cloudflare Worker Fetch Handler ──────────────────────────────────────
export default {
  async fetch(request, env = {}, ctx) {
    const config = resolveConfig(env);
    const url = new URL(request.url);
    const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
    const clientIp = request.headers.get('cf-connecting-ip') || '127.0.0.1';

    // ── Handle CORS Preflight ─────────────────────────────────────────────────
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': 'Range, Authorization, Content-Type, X-Request-ID',
          'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length, Content-Disposition',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // ── Synthetic Health Probes & Operations ──────────────────────────────────
    if (url.pathname === '/health' || url.pathname === '/ready') {
      return new Response(
        JSON.stringify({
          status: 'healthy',
          service: 'teledrive-download-gateway',
          environment: config.ENVIRONMENT,
          originUrl: config.ORIGIN_URL,
          colo: request.cf?.colo || 'local',
          activeStreams: metrics.activeStreams,
          uptime: Math.floor((Date.now() - metrics.startTime) / 1000),
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'X-Request-ID': requestId },
        }
      );
    }

    if (url.pathname === '/status') {
      return new Response(
        JSON.stringify({
          status: 'operational',
          edgeRouter: 'Cloudflare Workers Distributed Edge',
          gatewayVersion: '1.0.0',
          datacenter: request.cf?.colo || 'DEV',
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'X-Request-ID': requestId },
        }
      );
    }

    if (url.pathname === '/metrics') {
      return new Response(
        JSON.stringify({
          success: true,
          metrics: {
            ...metrics,
            uptimeSeconds: Math.floor((Date.now() - metrics.startTime) / 1000),
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'X-Request-ID': requestId },
        }
      );
    }

    // ── Route: /d/:token (Download Gateway) ───────────────────────────────────
    if (url.pathname.startsWith('/d/')) {
      const token = url.pathname.replace(/^\/d\//, '').split('/')[0];

      // Edge Rate Limiting
      const rateCheck = checkEdgeRateLimit(clientIp, config.RATE_LIMIT_PER_MINUTE);
      if (!rateCheck.allowed) {
        return jsonError(
          429,
          'RATE_LIMIT_EXCEEDED',
          `Too many requests from this IP. Please retry in ${rateCheck.retryAfter} seconds.`,
          requestId,
          { 'Retry-After': String(rateCheck.retryAfter) }
        );
      }

      // 1. Verify Cryptographic Signature & Expiration
      const authResult = await verifyDownloadToken(
        token,
        config.DOWNLOAD_GATEWAY_SECRET,
        config.DOWNLOAD_GATEWAY_ROTATION_SECRET
      );

      if (!authResult.valid) {
        metrics.errorRequests++;
        return jsonError(authResult.status, authResult.code, authResult.error, requestId);
      }

      const payload = authResult.payload;
      const fileSize = payload.sz;
      const fileName = payload.fn || 'download.bin';
      const mimeType = payload.mt || 'application/octet-stream';
      const cachePolicy = payload.pol || 'private';
      const rangeHeader = request.headers.get('range');
      const isHead = request.method === 'HEAD';
      const isDownloadAttachment = url.searchParams.get('download') === '1';
      const dispositionType = isDownloadAttachment ? 'attachment' : 'inline';

      // 2. Validate Range Header
      const rangeCheck = parseHttpRange(rangeHeader, fileSize);
      if (!rangeCheck.valid && rangeCheck.isRange) {
        return jsonError(
          416,
          'RANGE_NOT_SATISFIABLE',
          rangeCheck.error || 'Requested Range Not Satisfiable',
          requestId,
          {
            'Content-Range': `bytes */${fileSize}`,
            'Accept-Ranges': 'bytes',
          }
        );
      }

      // 3. Fast HEAD fulfillment: return metadata directly from verified payload
      if (isHead) {
        const headers = new Headers({
          'Content-Type': mimeType,
          'Accept-Ranges': 'bytes',
          'Content-Disposition': formatSafeContentDisposition(fileName, dispositionType),
          'X-Request-ID': requestId,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length, Content-Disposition',
        });

        if (cachePolicy === 'public') {
          headers.set('Cache-Control', `public, max-age=${config.DEFAULT_CACHE_MAX_AGE_SECONDS}, s-maxage=604800, immutable`);
        } else {
          headers.set('Cache-Control', 'private, no-store');
        }

        if (rangeCheck.isRange && rangeCheck.range) {
          headers.set('Content-Range', `bytes ${rangeCheck.range.start}-${rangeCheck.range.end}/${fileSize}`);
          headers.set('Content-Length', String(rangeCheck.range.chunkSize));
          return new Response(null, { status: 206, headers });
        } else {
          headers.set('Content-Length', String(fileSize));
          return new Response(null, { status: 200, headers });
        }
      }

      // 4. Edge Caching Strategy (Public Immutable Downloads Only)
      let cache = null;
      let cacheKey = null;

      if (config.ENABLE_EDGE_CACHE && cachePolicy === 'public' && typeof caches !== 'undefined' && !rangeHeader) {
        try {
          cache = caches.default;
          const cacheUrl = new URL(request.url);
          cacheUrl.search = '';
          cacheUrl.pathname = `/cache/${payload.fid}/${payload.cs || 'v1'}`;
          cacheKey = new Request(cacheUrl.toString(), { method: 'GET' });

          const cachedResponse = await cache.match(cacheKey);
          if (cachedResponse) {
            metrics.cacheHits++;
            metrics.totalRequests++;
            const newHeaders = new Headers(cachedResponse.headers);
            newHeaders.set('CF-Cache-Status', 'HIT');
            newHeaders.set('X-Request-ID', requestId);
            newHeaders.set('Access-Control-Allow-Origin', '*');
            return new Response(cachedResponse.body, {
              status: cachedResponse.status,
              headers: newHeaders,
            });
          }
          metrics.cacheMisses++;
        } catch {
          // Cache API unavailable in some local dev modes; fall through gracefully
        }
      }

      // 5. Upstream Stream Forwarding with Client Disconnect Propagation
      const upstreamEndpoint = `${config.ORIGIN_URL}/api/v1/internal/download-stream/${token}`;

      const upstreamAbort = new AbortController();
      if (request.signal) {
        request.signal.addEventListener('abort', () => {
          upstreamAbort.abort();
        });
      }

      const upstreamHeaders = new Headers({
        'User-Agent': 'TeleDrive-Cloudflare-Worker-Gateway/1.0',
        'X-Request-ID': requestId,
        'X-Internal-Gateway-Secret': config.INTERNAL_STREAM_SECRET,
      });

      if (rangeHeader) {
        upstreamHeaders.set('Range', rangeHeader);
      }

      metrics.activeStreams++;
      metrics.totalRequests++;
      if (rangeCheck.isRange) metrics.rangeRequests++;

      try {
        const upstreamResponse = await fetch(upstreamEndpoint, {
          method: 'GET',
          headers: upstreamHeaders,
          signal: upstreamAbort.signal,
        });

        if (!upstreamResponse.ok) {
          metrics.activeStreams = Math.max(0, metrics.activeStreams - 1);
          metrics.errorRequests++;

          const contentType = upstreamResponse.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const errBody = await upstreamResponse.json().catch(() => ({}));
            return new Response(JSON.stringify(errBody), {
              status: upstreamResponse.status,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'X-Request-ID': requestId,
                ...(upstreamResponse.status === 429 && upstreamResponse.headers.get('retry-after')
                  ? { 'Retry-After': upstreamResponse.headers.get('retry-after') }
                  : {}),
              },
            });
          }

          return jsonError(
            upstreamResponse.status,
            'UPSTREAM_ERROR',
            `Origin storage service returned status ${upstreamResponse.status}`,
            requestId
          );
        }

        if (!upstreamResponse.body) {
          metrics.activeStreams = Math.max(0, metrics.activeStreams - 1);
          metrics.errorRequests++;
          return jsonError(502, 'BAD_GATEWAY', 'Upstream returned an empty response body', requestId);
        }

        // 6. Build Client Response Headers
        const clientHeaders = new Headers();
        clientHeaders.set('Content-Type', mimeType);
        clientHeaders.set('Accept-Ranges', 'bytes');
        clientHeaders.set(
          'Content-Disposition',
          formatSafeContentDisposition(fileName, dispositionType)
        );
        clientHeaders.set('Access-Control-Allow-Origin', '*');
        clientHeaders.set(
          'Access-Control-Expose-Headers',
          'Content-Range, Accept-Ranges, Content-Length, Content-Disposition'
        );
        clientHeaders.set('X-Request-ID', requestId);
        clientHeaders.set('CF-Edge-Router', 'Cloudflare-Worker-Gateway');

        const upstreamContentLength = upstreamResponse.headers.get('content-length');
        const upstreamContentRange = upstreamResponse.headers.get('content-range');

        if (upstreamContentLength) {
          clientHeaders.set('Content-Length', upstreamContentLength);
        }
        if (upstreamContentRange) {
          clientHeaders.set('Content-Range', upstreamContentRange);
        }

        if (cachePolicy === 'public') {
          clientHeaders.set('Cache-Control', `public, max-age=${config.DEFAULT_CACHE_MAX_AGE_SECONDS}, s-maxage=604800, immutable`);
        } else {
          clientHeaders.set('Cache-Control', 'private, no-store');
        }

        const responseStatus = upstreamResponse.status;

        // 7. Zero-buffering Streaming Passthrough with Chunk Byte Counting
        const transformStream = new TransformStream({
          transform(chunk, controller) {
            metrics.totalBytesDelivered += chunk.byteLength;
            controller.enqueue(chunk);
          },
          flush() {
            metrics.activeStreams = Math.max(0, metrics.activeStreams - 1);
            metrics.completedRequests++;
          },
        });

        const clientStream = upstreamResponse.body.pipeThrough(transformStream);

        const clientResponse = new Response(clientStream, {
          status: responseStatus,
          headers: clientHeaders,
        });

        if (cache && cacheKey && responseStatus === 200 && ctx?.waitUntil) {
          const cacheHeaders = new Headers(clientHeaders);
          cacheHeaders.set('Cache-Control', `public, max-age=${config.DEFAULT_CACHE_MAX_AGE_SECONDS}, s-maxage=604800, immutable`);
          const cacheClone = new Response(clientResponse.clone().body, {
            status: 200,
            headers: cacheHeaders,
          });
          ctx.waitUntil(cache.put(cacheKey, cacheClone).catch(() => {}));
        }

        return clientResponse;

      } catch (err) {
        metrics.activeStreams = Math.max(0, metrics.activeStreams - 1);

        if (err.name === 'AbortError' || request.signal?.aborted) {
          metrics.abortedRequests++;
          return new Response(null, { status: 499, headers: { 'X-Request-ID': requestId } });
        }

        metrics.errorRequests++;
        return jsonError(
          502,
          'STREAM_FETCH_FAILED',
          'Failed to connect to storage streaming bridge: ' + (err.message || 'Network error'),
          requestId
        );
      }
    }

    return jsonError(404, 'NOT_FOUND', 'TeleDrive Download Gateway route not found', requestId);
  },
};
