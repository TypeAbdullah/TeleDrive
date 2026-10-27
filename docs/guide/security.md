# Security & Token Authentication

TeleDrive was architected with a zero-trust model between the edge and the origin.

---

## 1. Cryptographic HMAC Token Pipeline

Each download request is authorized through a short-lived, tamper-proof HMAC-SHA-256 token. The token contains the file metadata (`fid`, `sz`, `mt`), permission policy, and timestamp claims.

```
       Origin Server                         Cloudflare Edge Worker
  [Secret Key: S]                                [Secret Key: S]
         │                                              │
         ▼                                              ▼
 Payload P + Sign(P, S) ──────> Token ──────> Web Crypto Verify(P, S)
                                                        │
                                            ┌───────────┴───────────┐
                                            ▼                       ▼
                                       Valid Token            Invalid / Expired
                                  Stream File from Origin      403 / 410 Forbidden
```

### Signature Generation
The signature is generated using Node.js `crypto.createHmac('sha256', SECRET)`:

```typescript
const hmac = crypto.createHmac('sha256', secret);
hmac.update(`${headerB64}.${payloadB64}`);
const signatureB64 = hmac.digest('base64url');
```

### Signature Verification at Cloudflare Edge
The Cloudflare Worker imports the key into the Web Crypto API using `crypto.subtle.importKey`:

```javascript
const key = await crypto.subtle.importKey(
  'raw',
  secretBytes,
  { name: 'HMAC', hash: 'SHA-256' },
  false,
  ['verify']
);

const isValid = await crypto.subtle.verify(
  'HMAC',
  key,
  signatureBytes,
  dataBytes
);
```

---

## 2. Instant Token Revocation

Even before a token's `exp` timestamp has lapsed, tokens can be instantly revoked across three layers:

1. **Share Link Kill Switch**: If a shared folder or public download link is deleted or revoked by the owner, all tokens containing that `sid` are invalidated via MongoDB query.
2. **JTI Redis Blacklist**: Each token possesses a unique `jti` claim. Upon logout or manual file deletion, the `jti` is pushed to Redis with an expiration matching the token's remaining lifetime:
   ```bash
   SET td:revoked:<jti> "1" EX <ttlSeconds>
   ```
3. **Origin Internal Secret**: All internal requests between Cloudflare Edge and `/api/v1/internal/download-stream` are validated with `X-Internal-Gateway-Secret`. Direct unauthorized requests to the origin return `401 Unauthorized`.
