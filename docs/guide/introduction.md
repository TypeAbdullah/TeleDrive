# Introduction to TeleDrive

**TeleDrive** is an open-source, distributed cloud storage engine that transforms Telegram's MTProto infrastructure into a secure, edge-accelerated object storage system.

By decoupling the storage layer (Telegram data centers) from the presentation and delivery layer (Node.js Control API + Cloudflare Workers), TeleDrive enables developers and teams to store, organize, and stream large files with **zero cloud storage fees** and **enterprise-level throughput**.

---

## Why TeleDrive?

Traditional cloud storage providers (such as Amazon S3, Google Cloud Storage, or Backblaze B2) incur steep recurring costs for bandwidth and stored gigabytes:

| Feature | Conventional Object Storage (S3/B2) | TeleDrive Architecture |
| :--- | :--- | :--- |
| **Storage Cost** | $0.005 - $0.023 per GB/mo | **$0.00 (Backed by MTProto)** |
| **Egress Bandwidth** | $0.01 - $0.09 per GB | **Cloudflare Edge Free Tier / Zero Origin Load** |
| **Partial Range Seeking** | Standard HTTP Range | **RFC 7233 via Cloudflare Worker V8 Isolates** |
| **Memory Overhead** | Dependent on server architecture | **Bounded RAM (< 15 MB per active stream)** |
| **Security Layer** | Signed IAM URLs / Pre-signed URLs | **HMAC-SHA-256 Web Crypto Tokens with Instant Revocation** |

---

## Core Pillars of the Platform

### 1. Telegram MTProto as Storage Layer
Telegram allows file uploads up to 2GB per chunk. TeleDrive slices larger payloads into multi-part chunk streams, dispatches them across authenticated storage bot/session channels, and stores metadata in a high-speed MongoDB instance.

### 2. Cloudflare Worker Edge Gateway
Instead of passing millions of download requests directly through the Node.js application server, incoming traffic hits a lightweight Cloudflare Worker (`worker.js`). The worker:
- Verifies HMAC-SHA-256 token signatures directly at the edge in `< 1ms`.
- Answers `HEAD` requests without touching the origin.
- Handles HTTP Range header slicing (`206 Partial Content`) for instant video scrubbing.
- Caches public immutable assets using the Cloudflare Cache API.

### 3. Bounded-Memory Origin Streaming
The Node.js bridge enforces strict stream backpressure. Chunks retrieved from Telegram via `@mtcute/node` are piped byte-by-byte into the HTTP response stream. Memory usage is strictly capped at under 15 MB per concurrent transfer, preventing Node.js Out-Of-Memory (OOM) crashes under heavy load.

### 4. Developer REST API & OpenAPI
TeleDrive includes a comprehensive REST API secured with Developer API keys (`keyId:rawSecret`) and Bearer session tokens. Developers can integrate TeleDrive into their applications for automated backups, video streaming platforms, or content distribution networks.

---

## Architecture at a Glance

```
┌──────────────┐         ┌─────────────────────────┐         ┌────────────────────────┐
│ Client App / │ ──────> │  Cloudflare Worker Edge │ ──────> │ TeleDrive Control API  │
│ Video Player │ <────── │   (Edge HMAC & Cache)   │ <────── │  (Node.js + BullMQ)    │
└──────────────┘         └─────────────────────────┘         └───────────┬────────────┘
                                                                         │
                                                                         ▼
                                                             ┌────────────────────────┐
                                                             │ Telegram MTProto Nodes │
                                                             │   (Decentralized DC)   │
                                                             └────────────────────────┘
```

---

## Next Steps

- Jump to [Quick Start](/guide/getting-started) to run TeleDrive locally using Docker.
- Understand our [System Architecture](/guide/architecture).
- Inspect the [Cloudflare Edge Gateway](/guide/cloudflare-edge).
