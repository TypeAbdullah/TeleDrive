import { z } from 'zod';

const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  API_BASE_URL: z.string().url().default('http://localhost:3000'),

  // Better Auth
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters'),
  BETTER_AUTH_URL: z.string().url().default('http://localhost:3000'),

  // Discord OAuth
  DISCORD_CLIENT_ID: z.string().min(1, 'DISCORD_CLIENT_ID is required'),
  DISCORD_CLIENT_SECRET: z.string().min(1, 'DISCORD_CLIENT_SECRET is required'),

  // MongoDB Atlas (SRV)
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  MONGODB_DB_NAME: z.string().default('teledrive'),

  // Redis (optional)
  REDIS_URL: z.string().optional().default(''),
  REDIS_REQUIRED: z.string().transform(v => v === 'true').default('false'),

  // Telegram MTProto
  TELEGRAM_API_ID: z.string().optional().default(''),
  TELEGRAM_API_HASH: z.string().optional().default(''),
  TELEGRAM_SESSION_ENCRYPTION_KEY: z.string().optional().default(''),

  // Upload
  MAX_UPLOAD_SIZE: z.coerce.number().int().positive().default(2147483648), // 2GB
  MAX_CONCURRENT_UPLOADS_PER_USER: z.coerce.number().int().positive().default(3),
  MAX_CONCURRENT_UPLOADS_PER_ACCOUNT: z.coerce.number().int().positive().default(2),
  UPLOAD_CHUNK_SIZE: z.coerce.number().int().positive().default(524288), // 512KB

  // Download & Cloudflare Worker Gateway
  MAX_CONCURRENT_DOWNLOADS_PER_USER: z.coerce.number().int().positive().default(5),
  MAX_CONCURRENT_DOWNLOADS_PER_ACCOUNT: z.coerce.number().int().positive().default(5),
  MAX_CONCURRENT_DOWNLOADS_PER_SHARE: z.coerce.number().int().positive().default(10),
  MAX_CONCURRENT_DOWNLOADS_PER_API_KEY: z.coerce.number().int().positive().default(10),
  DOWNLOAD_GATEWAY_URL: z.string().default('http://localhost:8787'),
  DOWNLOAD_GATEWAY_SECRET: z.string().min(16).default('default-teledrive-download-secret-32-bytes!'),
  DOWNLOAD_GATEWAY_ROTATION_SECRET: z.string().optional().default(''),
  DOWNLOAD_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  INTERNAL_STREAM_SECRET: z.string().min(16).default('default-internal-stream-secret-32-chars!'),
  ENABLE_WORKER_DOWNLOAD_REDIRECT: z.string().transform(v => v === 'true').default('false'),

  // Rate limiting
  RATE_LIMIT_WEB_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WEB_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_DEV_MAX: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_DEV_WINDOW_MS: z.coerce.number().int().positive().default(60000),

  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:5173'),

  // Developer API
  DEVELOPER_API_DOMAIN: z.string().optional().default(''),
  API_KEY_HASH_ALGORITHM: z.string().default('sha256'),
  TRUST_PROXY: z.string().default('true'),

  // Cache TTLs (seconds)
  CACHE_TTL_FILE_METADATA: z.coerce.number().int().nonnegative().default(300),
  CACHE_TTL_FOLDER_LISTING: z.coerce.number().int().nonnegative().default(120),
  CACHE_TTL_SHARE_LINK: z.coerce.number().int().nonnegative().default(600),
  CACHE_TTL_USER_QUOTA: z.coerce.number().int().nonnegative().default(60),
  CACHE_TTL_ACCOUNT_HEALTH: z.coerce.number().int().nonnegative().default(30),

  // Queue
  UPLOAD_MAX_RETRIES: z.coerce.number().int().nonnegative().default(3),
  UPLOAD_BACKOFF_BASE_MS: z.coerce.number().int().positive().default(5000),
  JOB_LEASE_TIMEOUT_SECONDS: z.coerce.number().int().positive().default(300),

  // Storage
  DEFAULT_USER_QUOTA_BYTES: z.coerce.number().int().positive().default(10737418240), // 10GB
  ACCOUNT_UTILIZATION_THRESHOLD: z.coerce.number().min(0).max(1).default(0.85),
});

export type EnvConfig = z.infer<typeof envSchema>;

let _config: EnvConfig | null = null;

/**
 * Validates environment variables at startup and returns a typed config object.
 * Fails fast with detailed error messages for missing or invalid values.
 */
export function loadConfig(): EnvConfig {
  if (_config) return _config;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map(issue => `  ✗ ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    console.error(`\n╔══════════════════════════════════════════════╗`);
    console.error(`║  TeleDrive — Environment Validation Failed   ║`);
    console.error(`╚══════════════════════════════════════════════╝\n`);
    console.error(formatted);
    console.error(`\nCopy .env.example to .env and fill in the required values.\n`);
    process.exit(1);
  }

  _config = result.data;
  return _config;
}

/**
 * Returns the already-loaded config. Throws if loadConfig() hasn't been called.
 */
export function getConfig(): EnvConfig {
  if (!_config) {
    throw new Error('Config not loaded. Call loadConfig() at startup before accessing config.');
  }
  return _config;
}
