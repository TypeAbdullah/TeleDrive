# Configuration & Environment Variables

This document lists all environment variables required by the TeleDrive control API, worker processes, and the Cloudflare Edge Gateway.

---

## 1. Application Server Configuration

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | Number | `5000` | Port for the Node.js Express server |
| `NODE_ENV` | String | `development` | Environment mode (`development` or `production`) |
| `APP_URL` | String | `http://localhost:5000` | Public backend base URL |
| `FRONTEND_URL` | String | `http://localhost:5173` | Allowed CORS origin for web app |

---

## 2. Telegram MTProto Configuration

| Variable | Type | Description |
| :--- | :--- | :--- |
| `TELEGRAM_API_ID` | Number | Your Telegram Application API ID from [my.telegram.org](https://my.telegram.org) |
| `TELEGRAM_API_HASH` | String | Your Telegram Application API Hash |
| `TELEGRAM_BOT_TOKEN` | String | Bot token generated via [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_STORAGE_CHAT_ID` | String / Number | Private channel or supergroup ID where chunks are persisted |

---

## 3. Database & Caching Services

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `MONGODB_URI` | String | `mongodb://localhost:27017/teledrive` | MongoDB connection string |
| `REDIS_URL` | String | `redis://localhost:6379` | Redis connection URI for BullMQ queues and locks |

---

## 4. Cryptographic Secrets

::: danger Security Requirement
All secrets must be cryptographically random and at least 32 characters in length. Never commit these secrets to version control.
:::

| Variable | Type | Description |
| :--- | :--- | :--- |
| `DOWNLOAD_GATEWAY_SECRET` | String | Secret key for HMAC-SHA-256 token generation and validation |
| `DOWNLOAD_GATEWAY_ROTATION_SECRET` | String | Secondary key used during zero-downtime key rotation |
| `INTERNAL_GATEWAY_SECRET` | String | Shared header key between Cloudflare Worker and `/internal/download-stream` |
| `DOWNLOAD_GATEWAY_URL` | String | Public base URL of your Cloudflare Worker (e.g. `https://download.example.com`) |

---

## 5. Concurrency & Performance Limits

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `CONCURRENT_DOWNLOADS_PER_USER` | Number | `3` | Max concurrent active streams per individual user |
| `GLOBAL_MAX_CONCURRENT_DOWNLOADS` | Number | `50` | Max concurrent active streams across the origin node |
| `MAX_FILE_SIZE_BYTES` | Number | `2097152000` | Max file upload size (2 GB limit) |
