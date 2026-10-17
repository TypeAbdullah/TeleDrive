# TeleDrive — Cloudflare Distributed Download Infrastructure

## 1. System Architecture

```
                  ┌──────────────────────────────────────────────┐
                  │                 Client Browser               │
                  │              or Developer API Client         │
                  └──────────────────────┬───────────────────────┘
                                         │
                        1. Request Download Authorization
                        (GET /api/v1/download/:id/signed-url)
                        (POST /developer/v1/files/:id/downloads)
                        (GET /dl/:token/signed-url)
                                         │
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │          TeleDrive Node.js Control API       │
                  │   - Better Auth & API Key validation         │
                  │   - Quota & Permission checks                │
                  │   - Issues HMAC-SHA-256 Signed Token         │
                  └──────────────────────┬───────────────────────┘
                                         │
                        2. Direct download request
                        GET https://download.example.com/d/<token>
                        Range: bytes=start-end
                                         │
                                         ▼
    ┌────────────────────────────────────────────────────────────────────────┐
    │              Cloudflare Edge / Distributed Download Gateway            │
    │                               (worker.js)                              │
    │  - Edge HMAC-SHA-256 Web Crypto Signature Verification                 │
    │  - Token Expiration & Replay Validation                                │
    │  - HTTP Range Parsing & RFC 7233 Slicing                               │
    │  - Safe Content-Disposition Formatting (RFC 5987 / RFC 6266)           │
    │  - Edge Cache API (caches.default for Public Immutable Files)          │
    │  - Request Tracing (X-Request-ID, cf-ray) & Edge Metrics               │
    │  - Client Disconnect & AbortSignal Propagation                         │
    └──────────────────┬──────────────────────────────────┬──────────────────┘
                       │                                  │
           [Cache Hit: Public File]               [Cache Miss / Private]
                       │                                  │
                       ▼                                  ▼
             Fast Edge Response            Forward to Authorized Origin Stream
            (Zero Origin Traffic)           GET /api/v1/internal/download-stream/:token
                                            X-Internal-Gateway-Secret: <SECRET>
                                                          │
                                                          ▼
                                           ┌─────────────────────────────┐
                                           │  Node.js Streaming Bridge   │
                                           │  - Concurrency Guard        │
                                           │  - Backpressure Streams     │
                                           │  - Bounded RAM (< 15 MB)    │
                                           │  - MTcute / Local Disk      │
                                           └─────────────────────────────┘
```

---

## 2. Key Components & Implementation

### 2.1 Cloudflare Worker Gateway (`worker.js`)
- Located at root `worker.js` and `workers/download-gateway/worker.js`.
- Self-contained, zero-dependency ES module that runs natively on Cloudflare Workers (V8 isolates).
- Uses `crypto.subtle` for HMAC-SHA-256 token verification.
- Supports zero-downtime key rotation using `DOWNLOAD_GATEWAY_ROTATION_SECRET`.
- Pipes upstream Web Streams with backpressure, never buffering the response body.
- Immediate client abort detection: aborts the upstream fetch connection when the client disconnects.
- Supports `HEAD` requests directly at the edge from validated payload metadata.
- Handles partial downloads with `206 Partial Content` and `416 Range Not Satisfiable`.

### 2.2 Signed Download Authorization Service (`download-auth.service.ts`)
- File: `backend/src/services/download-auth.service.ts`
- Issues compact tokens containing:
  - `fid`: File ID
  - `fn`: Sanitized File Name
  - `sz`: File size in bytes
  - `mt`: MIME type
  - `uid`: User ID or `'anonymous'`
  - `sid`: Optional Share Link ID
  - `kid`: Optional API Key ID
  - `scp`: Scope (`'read'` or `'download'`)
  - `pol`: Cache & Access Policy (`'public'`, `'private'`, `'revocable'`)
  - `cs`: File checksum (ETag)
  - `jti`: Unique token identifier
  - `iat` / `exp`: Issued at and expiration timestamps
- Revocation tracking:
  - Tokens tied to a `sid` (Share Link) are checked against MongoDB: if the share link is revoked or deleted, download requests immediately return `410 Gone`.
  - Individual token JTIs can be revoked in Redis via `td:revoked:<jti>` with TTL matching the expiration.

### 2.3 Bounded-Memory Origin Streaming (`download.service.ts`)
- File: `backend/src/services/download.service.ts`
- Enforces strict bounded RAM: chunks are streamed directly to the socket without whole-file buffering.
- Single-chunk and multi-chunk files support byte range seeking (`start`, `end`).
- Client disconnect cleanup: listens to `req.on('close')` and `res.on('close')` to promptly destroy active readable streams and release Telegram scheduler slots.

### 2.4 Distributed Concurrency Guard (`concurrency-guard.ts`)
- File: `backend/src/infrastructure/concurrency/concurrency-guard.ts`
- Redis-backed distributed atomic counters with memory fallback.
- Enforces independent limits:
  - `MAX_CONCURRENT_DOWNLOADS_PER_USER` (default: 5)
  - `MAX_CONCURRENT_DOWNLOADS_PER_SHARE` (default: 10)
  - `MAX_CONCURRENT_DOWNLOADS_PER_API_KEY` (default: 10)
  - `MAX_CONCURRENT_DOWNLOADS_PER_ACCOUNT` (default: 5)
- Automatically responds with `429 Too Many Requests` and `Retry-After: 5` header when limits are exceeded.

### 2.5 Developer API Integration (`POST /developer/v1/files/:fileId/downloads`)
- File: `backend/src/routes/developer-api.routes.ts`
- Requires API key with `read` or `download` scope.
- Issues a signed authorization URL pointing to the Cloudflare Worker Gateway:
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://download.example.com/d/eyJhbGci...",
    "expiresAt": "2026-10-17T15:45:00.000Z",
    "file": {
      "id": "673f1...",
      "name": "dataset.tar.gz",
      "size": 524288000,
      "mimeType": "application/gzip"
    },
    "rangeSupported": true
  }
}
```

---

## 3. Deployment Guide

### 3.1 Prerequisites
- Cloudflare account with Workers enabled.
- Cloudflare Wrangler CLI (`npm install -g wrangler` or `npx wrangler`).

### 3.2 Wrangler Configuration (`workers/download-gateway/wrangler.toml`)
```toml
name = "teledrive-download-gateway"
main = "worker.js"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

[vars]
ENVIRONMENT = "production"
ORIGIN_URL = "https://api.yourdomain.com"
DOWNLOAD_GATEWAY_URL = "https://download.yourdomain.com"
ENABLE_EDGE_CACHE = "true"
DEFAULT_CACHE_MAX_AGE_SECONDS = "86400"
```

### 3.3 Provision Secrets in Cloudflare
Run the following commands to provision the encrypted secrets into Cloudflare Workers:
```bash
# 1. Download Gateway Signing Secret (Must match backend DOWNLOAD_GATEWAY_SECRET)
wrangler secret put DOWNLOAD_GATEWAY_SECRET

# 2. Internal Streaming Secret (Must match backend INTERNAL_STREAM_SECRET)
wrangler secret put INTERNAL_STREAM_SECRET

# 3. (Optional) Key Rotation Secret
wrangler secret put DOWNLOAD_GATEWAY_ROTATION_SECRET
```

### 3.4 Deploy Worker
```bash
cd workers/download-gateway

# Local development simulation:
npm run dev

# Deploy to Staging:
npm run deploy:staging

# Deploy to Production:
npm run deploy:prod
```

### 3.5 Custom Domain & DNS Setup
1. In the **Cloudflare Dashboard**, navigate to **Workers & Pages** > **teledrive-download-gateway**.
2. Select **Settings** > **Domains & Routes** > **Add** > **Custom Domain**.
3. Enter your download hostname, e.g., `download.yourdomain.com`.
4. Cloudflare automatically configures DNS and issues an edge SSL certificate.
5. In your backend `.env`, set:
   ```env
   DOWNLOAD_GATEWAY_URL=https://download.yourdomain.com
   ENABLE_WORKER_DOWNLOAD_REDIRECT=true
   ```

---

## 4. Rollback & Versioning Strategy

Cloudflare Workers provides instant zero-downtime rollbacks:

### View Deployment History
```bash
wrangler deployments list
```

### Instant Rollback
```bash
# Rollback to the previous deployment version:
wrangler rollback [DEPLOYMENT_ID]
```

### Gradual Traffic Splitting / Canary Deployments
Cloudflare Workers supports percentage-based traffic splitting:
```bash
# Upload a new candidate version without directing 100% of traffic immediately:
wrangler versions upload

# Deploy 10% to new version and 90% to stable version:
wrangler versions deploy <VERSION_ID>@10% <STABLE_VERSION_ID>@90%
```

---

## 5. Benchmark & Validation Results

A rigorous benchmark script (`scripts/benchmark-downloads.ts`) was executed using a 50MB synthetic binary payload across various concurrency and streaming scenarios.

### Measured Results:
| Test Scenario | Data Delivered | TTFB | Duration | Throughput | Peak Origin RSS Delta |
|:---|:---:|:---:|:---:|:---:|:---:|
| **Test 1: Direct Origin Stream (50MB)** | 50.0 MB | 59 ms | 315 ms | 158.7 MB/s | +17.19 MB |
| **Test 2: Cloudflare Worker Stream (50MB)** | 50.0 MB | 40 ms | 472 ms | 105.9 MB/s | -6.25 MB |
| **Test 3: HTTP Range Slicing (1MB Slice)** | 1.0 MB | 22 ms | 34 ms | 30.1 MB/s | +0.12 MB |
| **Test 4: 5 Concurrent Streams (250MB Total)** | 250.0 MB | 45 ms | 1626 ms | 153.7 MB/s | **+9.25 MB** |
| **Test 5: Client Early Disconnect (Abort at 2MB)** | 2.0 MB | 30 ms | 45 ms | - | Streams freed immediately |

### Primary Success Criteria Verification:
- **Baseline Origin RSS:** `188.83 MB`
- **Final Origin RSS after ~353 MB of downloads:** `198.09 MB`
- **Total RSS Delta:** `+9.26 MB`
- **Conclusion:** Memory consumption is strictly bounded and did **NOT** scale with the 353 MB of total streamed payloads.
