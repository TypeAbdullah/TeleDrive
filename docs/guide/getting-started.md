# Getting Started

Follow this guide to get TeleDrive up and running locally or on your production server.

---

## Prerequisites

Make sure you have installed:
- **Node.js**: `v20.0.0` or higher (Node 22+ recommended)
- **Docker & Docker Compose**: For local MongoDB and Redis instances
- **Telegram Account**: To generate MTProto `API_ID` and `API_HASH` from [my.telegram.org](https://my.telegram.org)
- **Telegram Bot Token**: Created via [@BotFather](https://t.me/BotFather)

---

## 1. Clone the Repository

```bash
git clone https://github.com/TypeAbdullah/TeleDrive.git
cd TeleDrive
```

---

## 2. Install Dependencies

Install root and workspace dependencies:

```bash
npm install
```

---

## 3. Environment Configuration

Copy the sample environment file to `.env`:

```bash
cp .env.example .env
```

Open `.env` and configure your credentials:

```ini
# Application Ports & Host
PORT=5000
NODE_ENV=development
APP_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5173

# Telegram MTProto Credentials
TELEGRAM_API_ID=12345678
TELEGRAM_API_HASH=0123456789abcdef0123456789abcdef
TELEGRAM_BOT_TOKEN=123456789:ABCDefGhIJKlmNoPQRsTUVwxyZ
TELEGRAM_STORAGE_CHAT_ID=-1001234567890

# Databases
MONGODB_URI=mongodb://localhost:27017/teledrive
REDIS_URL=redis://localhost:6379

# Cryptographic Token Signing Secret (32+ chars)
DOWNLOAD_GATEWAY_SECRET=change-this-to-a-very-secure-random-32-byte-hex-string
DOWNLOAD_GATEWAY_ROTATION_SECRET=optional-secondary-secret-for-key-rotation
INTERNAL_GATEWAY_SECRET=super-secret-shared-gateway-key

# Edge Gateway URL
DOWNLOAD_GATEWAY_URL=http://localhost:8787
```

::: tip Generating Secure Secrets
Generate cryptographically secure 64-character hex strings with Node.js:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
:::

---

## 4. Start Infrastructure (Docker)

Launch MongoDB and Redis with Docker Compose:

```bash
npm run docker:up
```

Verify that MongoDB and Redis containers are healthy:

```bash
docker ps
```

---

## 5. Run Backend & Frontend in Development

You can start both backend and frontend concurrently:

```bash
npm run dev
```

Or run each service individually:

```bash
# Terminal 1: Backend API (port 5000)
npm run dev:backend

# Terminal 2: React Frontend (port 5173)
npm run dev:frontend
```

Once running:
- **Web App**: Open `http://localhost:5173`
- **API Status**: Check `http://localhost:5000/developer/v1/status`
- **Documentation**: Run `npm run docs:dev` (available on `http://localhost:5173`)

---

## 6. Run the Cloudflare Edge Worker Locally

To test the edge download gateway locally with Miniflare / Wrangler:

```bash
cd workers
npx wrangler dev worker.js --port 8787
```

Now, download requests to `http://localhost:8787/d/<token>` will be authenticated at the edge and proxied back to the local backend.
