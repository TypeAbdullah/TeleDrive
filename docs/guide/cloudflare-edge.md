# Cloudflare Edge Gateway

The Cloudflare Edge Gateway is implemented in `workers/worker.js`. It runs natively on Cloudflare Workers (V8 isolates) and acts as the front-line distributor for all file streaming traffic.

---

## 1. Responsibilities

The worker fulfills several crucial functions:
1. **Edge Token Verification**: Uses Web Crypto `crypto.subtle.verify()` to authenticate HMAC-SHA-256 signatures before forwarding requests to the origin.
2. **Instant Rejection**: Malicious or expired tokens are rejected in `< 1ms` at the edge, saving origin bandwidth and CPU.
3. **Range Slicing (RFC 7233)**: Supports `Range: bytes=start-end` requests, emitting `206 Partial Content` with accurate `Content-Range` headers.
4. **Direct HEAD Request Termination**: Responds to `HEAD` requests instantly using embedded token metadata without querying the Node.js origin.
5. **Client Disconnect Detection**: Listens to client connection aborts and propagates an `AbortSignal` to the upstream origin stream, immediately halting Telegram bandwidth consumption.
6. **Edge Caching**: Caches public immutable assets with `caches.default`.

---

## 2. Token Format & Payload Structure

The signed token is a Base64URL-encoded payload and signature:

$$\text{Token} = \text{base64url}(\text{PayloadJSON}) + \text{'.' + } \text{base64url}(\text{HMAC\_Signature})$$

### Payload Schema

```json
{
  "fid": "664fa1e2b5e2a34",
  "fn": "backup_database_2026.tar.gz",
  "sz": 154289410,
  "mt": "application/gzip",
  "uid": "usr_99214a",
  "sid": "sh_public_link_1",
  "kid": "key_prod_89",
  "scp": "download",
  "pol": "public",
  "cs": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "jti": "jti_48921a41bc9",
  "iat": 1745781200,
  "exp": 1745784800
}
```

| Field | Type | Description |
| :--- | :--- | :--- |
| `fid` | String | MongoDB File ID |
| `fn` | String | Sanitized filename |
| `sz` | Number | Total file size in bytes |
| `mt` | String | MIME type |
| `uid` | String | User ID or `'anonymous'` |
| `sid` | String | Optional Share Link ID (checked against revocation) |
| `kid` | String | Optional Developer API Key ID |
| `scp` | String | Scope: `'read'` or `'download'` |
| `pol` | String | Access Policy: `'public'`, `'private'`, or `'revocable'` |
| `cs` | String | File ETag / SHA-256 Checksum |
| `jti` | String | Unique token identifier for Redis revocation |
| `iat` | Number | Issued-at Unix timestamp |
| `exp` | Number | Expiration Unix timestamp |

---

## 3. Edge Worker Configuration (`wrangler.toml`)

Create or update your `wrangler.toml` file to deploy the worker:

```toml
name = "teledrive-download-gateway"
main = "worker.js"
compatibility_date = "2024-04-01"

[vars]
ORIGIN_URL = "https://api.yourdomain.com"
DOWNLOAD_GATEWAY_SECRET = "your-primary-32-byte-hex-secret"
DOWNLOAD_GATEWAY_ROTATION_SECRET = "your-secondary-32-byte-hex-secret"
INTERNAL_GATEWAY_SECRET = "your-internal-origin-secret"
CACHE_ENABLED = "true"
CACHE_TTL = "86400"
```

---

## 4. Deploying with Wrangler

Deploy to your Cloudflare account with a single command:

```bash
cd workers
npx wrangler deploy worker.js --name teledrive-download-gateway
```

Or configure custom routes in Cloudflare Dashboard:
- `download.yourdomain.com/d/*` ➔ `teledrive-download-gateway`
- `download.yourdomain.com/health` ➔ Edge health check probe
