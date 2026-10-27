# Developer REST & OpenAPI

TeleDrive provides a developer-first REST API to automate uploads, manage files, and generate signed, edge-accelerated streaming URLs.

---

## 1. Authentication

The Developer API supports two authentication mechanisms:

### Option A: Developer API Key (Recommended for automated scripts & servers)
Pass your API key in the `X-API-Key` header. Keys are formatted as `keyId:rawSecret`:

```http
X-API-Key: key_live_99a8123:c89fae01923485ab90123
```

### Option B: Bearer Session Token
Pass your session token in the standard `Authorization` header:

```http
Authorization: Bearer <session_token>
```

---

## 2. API Endpoints

All endpoints are prefixed with `/developer/v1`.

### Check API Health & Status
```http
GET /developer/v1/status
```

**Response (`200 OK`):**
```json
{
  "success": true,
  "status": "operational",
  "version": "1.0.0",
  "edgeGateway": "active",
  "timestamp": "2026-10-27T12:00:00.000Z"
}
```

---

### List Files (Paginated)
```http
GET /developer/v1/files?page=1&limit=50&folderId=folder_xyz
```

**Query Parameters:**
- `page` *(optional, default: 1)*: Page number.
- `limit` *(optional, default: 50, max: 100)*: Items per page.
- `folderId` *(optional)*: Filter files by parent directory.

**Response (`200 OK`):**
```json
{
  "success": true,
  "files": [
    {
      "id": "file_8923a41bc",
      "name": "project_presentation.mp4",
      "size": 78923145,
      "mimeType": "video/mp4",
      "checksum": "d41d8cd98f00b204e9800998ecf8427e",
      "status": "ready",
      "createdAt": "2026-10-25T14:20:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "totalPages": 1
  }
}
```

---

### Direct Streaming Upload
```http
POST /developer/v1/upload
Content-Type: multipart/form-data
```

**Form Data:**
- `file`: The binary payload to upload.
- `folderId` *(optional)*: Target folder ID.

**Response (`201 Created`):**
```json
{
  "success": true,
  "file": {
    "id": "file_9021a8124",
    "name": "archive.tar",
    "size": 104857600,
    "mimeType": "application/x-tar",
    "status": "processing"
  }
}
```

---

### Generate Signed Download URL
```http
POST /developer/v1/files/:fileId/downloads
Content-Type: application/json
```

**Request Body:**
```json
{
  "expiresInSeconds": 3600
}
```

**Response (`201 Created`):**
```json
{
  "success": true,
  "downloadUrl": "https://download.yourdomain.com/d/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2026-10-27T13:00:00.000Z"
}
```

---

## 3. Client Examples

### cURL

```bash
# 1. Generate signed download URL
curl -X POST https://api.yourdomain.com/developer/v1/files/file_8923a41bc/downloads \
  -H "X-API-Key: key_live_99a8123:c89fae01923485ab90123" \
  -H "Content-Type: application/json" \
  -d '{"expiresInSeconds": 7200}'

# 2. Download partial byte range directly from Cloudflare Worker
curl -X GET "https://download.yourdomain.com/d/<TOKEN>" \
  -H "Range: bytes=0-1048575" \
  -o "chunk_part.bin"
```

### TypeScript / Node.js

```typescript
import axios from 'axios';

const API_BASE = 'https://api.yourdomain.com/developer/v1';
const API_KEY = process.env.TELEDRIVE_API_KEY;

async function getDownloadLink(fileId: string) {
  const response = await axios.post(
    `${API_BASE}/files/${fileId}/downloads`,
    { expiresInSeconds: 3600 },
    {
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data.downloadUrl;
}
```
