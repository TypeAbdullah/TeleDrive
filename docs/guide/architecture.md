# System Architecture

TeleDrive is built on a four-tier architecture designed for horizontal scalability, zero data loss, and minimal server footprint.

---

## 1. High-Level Topology

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

## 2. Key Architecture Components

### Cloudflare Worker Gateway (`worker.js`)
- Runs directly on Cloudflare's global edge network (over 300 locations).
- **HMAC-SHA-256 Validation**: Employs `crypto.subtle.verify()` to validate signed tokens before any traffic touches the origin server.
- **Zero-Downtime Secret Rotation**: Supports dual-key validation with `DOWNLOAD_GATEWAY_ROTATION_SECRET`.
- **RFC 7233 Range Handling**: Converts incoming `Range: bytes=start-end` headers into upstream slice parameters.
- **RFC 5987 / RFC 6266 Headers**: Safely encodes Unicode filenames (`filename*=UTF-8''...`) for international character support.

### Bounded-Memory Origin Streaming
Under high concurrency, traditional Node.js servers buffer chunks in heap memory, causing memory spikes and V8 garbage collection freezes.
TeleDrive solves this with a **bounded streaming pipeline**:
1. Incoming streams from `@mtcute/node` are piped directly to the HTTP socket.
2. Backpressure signals (`pause()` and `resume()`) ensure data is only fetched from Telegram as fast as the client can receive it.
3. RAM usage per connection is strictly bounded to `< 15 MB`.

### Distributed Concurrency Guard
- Redis-backed distributed atomic counters (`INCR` / `DECR`) with in-memory fallback.
- Enforces separate concurrency limits:
  - Global concurrent streams across the entire cluster.
  - Per-IP rate limits.
  - Per-user quotas.

### Chunk Scheduler & Storage Sharding
- Files larger than 20MB are partitioned into uniform chunks.
- Chunks are uploaded in parallel to Telegram storage channels using dedicated worker queues powered by BullMQ.
- Hash-based chunk checksums (SHA-256) are calculated during upload to guarantee data integrity.
