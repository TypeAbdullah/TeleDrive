import mongoose from 'mongoose';
import { SystemSetting, ISystemSetting, SettingCategory } from '../models/SystemSetting.js';
import { AuditLog } from '../models/AuditLog.js';
import { createModuleLogger } from '../shared/logger.js';
import { ValidationError, AppError } from '../shared/errors.js';

const log = createModuleLogger('settings-service');

interface SettingDefinition {
  key: string;
  category: SettingCategory;
  label: string;
  description: string;
  defaultValue: any;
  valueType: 'string' | 'number' | 'boolean' | 'json';
  allowedValues?: any[];
  min?: number;
  max?: number;
  requiresRestart?: boolean;
}

export const SETTING_DEFINITIONS: SettingDefinition[] = [
  // ── Application ───────────────────────────────────────────────────────────
  {
    key: 'application.appUrl',
    category: 'application',
    label: 'Public Frontend App URL',
    description: 'The root URL where the frontend web client is hosted.',
    defaultValue: 'http://localhost:5173',
    valueType: 'string',
    requiresRestart: false,
  },
  {
    key: 'application.apiBaseUrl',
    category: 'application',
    label: 'Public API Base URL',
    description: 'The root URL where the TeleDrive backend API is exposed.',
    defaultValue: 'http://localhost:3000',
    valueType: 'string',
    requiresRestart: false,
  },
  {
    key: 'application.maintenanceMode',
    category: 'application',
    label: 'System Maintenance Mode',
    description: 'When enabled, non-admin requests are rejected with 503 Service Unavailable.',
    defaultValue: false,
    valueType: 'boolean',
    requiresRestart: false,
  },
  {
    key: 'application.maintenanceMessage',
    category: 'application',
    label: 'Maintenance Notice Message',
    description: 'Custom message displayed to users when maintenance mode is active.',
    defaultValue: 'TeleDrive is currently undergoing scheduled infrastructure maintenance. Please check back shortly.',
    valueType: 'string',
    requiresRestart: false,
  },
  {
    key: 'application.logLevel',
    category: 'application',
    label: 'Application Logging Level',
    description: 'Minimum log severity output to process stdout.',
    defaultValue: 'info',
    valueType: 'string',
    allowedValues: ['fatal', 'error', 'warn', 'info', 'debug', 'trace'],
    requiresRestart: false,
  },
  {
    key: 'application.requestTimeoutMs',
    category: 'application',
    label: 'HTTP Request Timeout',
    description: 'Default timeout for inbound API requests in milliseconds.',
    defaultValue: 30000,
    valueType: 'number',
    min: 1000,
    max: 120000,
    requiresRestart: false,
  },

  // ── Request Handling ──────────────────────────────────────────────────────
  {
    key: 'request_handling.maxConcurrentRequests',
    category: 'request_handling',
    label: 'Global Concurrency Ceiling',
    description: 'Maximum concurrent HTTP connections handled simultaneously.',
    defaultValue: 100,
    valueType: 'number',
    min: 10,
    max: 1000,
    requiresRestart: false,
  },
  {
    key: 'request_handling.perUserRateLimit',
    category: 'request_handling',
    label: 'Per-User Request Rate Limit',
    description: 'Maximum requests per minute permitted per authenticated user.',
    defaultValue: 100,
    valueType: 'number',
    min: 10,
    max: 5000,
    requiresRestart: false,
  },
  {
    key: 'request_handling.perApiKeyRateLimit',
    category: 'request_handling',
    label: 'Per-API-Key Request Rate Limit',
    description: 'Default maximum requests per minute permitted per developer API key.',
    defaultValue: 60,
    valueType: 'number',
    min: 10,
    max: 5000,
    requiresRestart: false,
  },

  // ── Telegram MTProto ──────────────────────────────────────────────────────
  {
    key: 'telegram.maxConcurrentUploadsGlobal',
    category: 'telegram',
    label: 'Telegram Global Upload Concurrency',
    description: 'Total active uploads permitted simultaneously across all accounts.',
    defaultValue: 15,
    valueType: 'number',
    min: 1,
    max: 50,
    requiresRestart: false,
  },
  {
    key: 'telegram.maxConcurrentDownloadsGlobal',
    category: 'telegram',
    label: 'Telegram Global Download Concurrency',
    description: 'Total active downloads permitted simultaneously across all accounts.',
    defaultValue: 25,
    valueType: 'number',
    min: 1,
    max: 100,
    requiresRestart: false,
  },
  {
    key: 'telegram.healthCheckIntervalMs',
    category: 'telegram',
    label: 'Session Health Check Interval',
    description: 'Frequency of background MTProto health and cooldown checks in milliseconds.',
    defaultValue: 15000,
    valueType: 'number',
    min: 5000,
    max: 120000,
    requiresRestart: false,
  },
  {
    key: 'telegram.circuitBreakerThreshold',
    category: 'telegram',
    label: 'Circuit Breaker Failure Threshold',
    description: 'Number of consecutive errors before a session circuit trips to OPEN.',
    defaultValue: 3,
    valueType: 'number',
    min: 1,
    max: 10,
    requiresRestart: false,
  },
  {
    key: 'telegram.circuitBreakerResetTimeoutMs',
    category: 'telegram',
    label: 'Circuit Breaker Reset Timeout',
    description: 'Duration in milliseconds before an open circuit enters HALF-OPEN canary testing.',
    defaultValue: 30000,
    valueType: 'number',
    min: 5000,
    max: 300000,
    requiresRestart: false,
  },

  // ── Transfers (Upload & Download) ─────────────────────────────────────────
  {
    key: 'transfers.maxUploadSize',
    category: 'transfers',
    label: 'Maximum File Upload Size',
    description: 'Maximum allowable file upload size in bytes (default 2GB).',
    defaultValue: 2147483648,
    valueType: 'number',
    min: 1048576,
    max: 4294967296,
    requiresRestart: false,
  },
  {
    key: 'transfers.uploadChunkSize',
    category: 'transfers',
    label: 'Resumable Upload Chunk Size',
    description: 'Size in bytes of individual chunk parts in resumable uploads (default 512KB).',
    defaultValue: 524288,
    valueType: 'number',
    min: 131072,
    max: 4194304,
    requiresRestart: false,
  },
  {
    key: 'transfers.maxConcurrentUploadsPerUser',
    category: 'transfers',
    label: 'Per-User Upload Concurrency',
    description: 'Maximum parallel uploads permitted for an individual user account.',
    defaultValue: 3,
    valueType: 'number',
    min: 1,
    max: 10,
    requiresRestart: false,
  },
  {
    key: 'transfers.maxConcurrentDownloadsPerUser',
    category: 'transfers',
    label: 'Per-User Download Concurrency',
    description: 'Maximum parallel downloads permitted for an individual user account.',
    defaultValue: 5,
    valueType: 'number',
    min: 1,
    max: 20,
    requiresRestart: false,
  },
  {
    key: 'transfers.maxConcurrentDownloadsPerShare',
    category: 'transfers',
    label: 'Per-Share Link Download Concurrency',
    description: 'Maximum parallel downloads permitted simultaneously for a single public share token.',
    defaultValue: 10,
    valueType: 'number',
    min: 1,
    max: 50,
    requiresRestart: false,
  },
  {
    key: 'transfers.maxConcurrentDownloadsPerApiKey',
    category: 'transfers',
    label: 'Per-API-Key Download Concurrency',
    description: 'Maximum parallel downloads permitted for a developer API key.',
    defaultValue: 10,
    valueType: 'number',
    min: 1,
    max: 50,
    requiresRestart: false,
  },
  {
    key: 'transfers.enableParallelDownloads',
    category: 'transfers',
    label: 'Enable Parallel Range Retrieval',
    description: 'Fetches disjoint chunks concurrently when downloading large files.',
    defaultValue: false,
    valueType: 'boolean',
    requiresRestart: false,
  },
  {
    key: 'transfers.parallelChunkConcurrency',
    category: 'transfers',
    label: 'Parallel Chunk Worker Count',
    description: 'Number of parallel sub-range chunk fetches per download stream.',
    defaultValue: 2,
    valueType: 'number',
    min: 1,
    max: 4,
    requiresRestart: false,
  },
  {
    key: 'transfers.staleUploadCleanupHours',
    category: 'transfers',
    label: 'Stale Upload Reconciliation Cutoff',
    description: 'Hours after which incomplete upload sessions are reconciled as failed.',
    defaultValue: 24,
    valueType: 'number',
    min: 1,
    max: 168,
    requiresRestart: false,
  },

  // ── Cloudflare Worker Gateway ─────────────────────────────────────────────
  {
    key: 'gateway.enabled',
    category: 'gateway',
    label: 'Worker Download Gateway Redirection',
    description: 'Redirect direct browser downloads to the Cloudflare Worker streaming gateway.',
    defaultValue: false,
    valueType: 'boolean',
    requiresRestart: false,
  },
  {
    key: 'gateway.url',
    category: 'gateway',
    label: 'Public Gateway Base URL',
    description: 'Public URL of the deployed Cloudflare Worker download gateway.',
    defaultValue: 'http://localhost:8787',
    valueType: 'string',
    requiresRestart: false,
  },
  {
    key: 'gateway.tokenTtlSeconds',
    category: 'gateway',
    label: 'Download Token Expiry',
    description: 'Lifetime of signed HMAC download authorization tokens in seconds.',
    defaultValue: 900,
    valueType: 'number',
    min: 60,
    max: 86400,
    requiresRestart: false,
  },

  // ── Cache & Performance ───────────────────────────────────────────────────
  {
    key: 'cache.ttlFileMetadataSeconds',
    category: 'cache',
    label: 'File Metadata Cache TTL',
    description: 'Cache TTL for file records and storage references in seconds.',
    defaultValue: 300,
    valueType: 'number',
    min: 0,
    max: 86400,
    requiresRestart: false,
  },
  {
    key: 'cache.ttlFolderListingSeconds',
    category: 'cache',
    label: 'Folder Listing Cache TTL',
    description: 'Cache TTL for directory contents listings in seconds.',
    defaultValue: 120,
    valueType: 'number',
    min: 0,
    max: 86400,
    requiresRestart: false,
  },
  {
    key: 'cache.ttlShareLinkSeconds',
    category: 'cache',
    label: 'Share Token Cache TTL',
    description: 'Cache TTL for resolved public share tokens in seconds.',
    defaultValue: 600,
    valueType: 'number',
    min: 0,
    max: 86400,
    requiresRestart: false,
  },
  {
    key: 'cache.ttlUserQuotaSeconds',
    category: 'cache',
    label: 'User Quota Cache TTL',
    description: 'Cache TTL for user quota and usage metrics in seconds.',
    defaultValue: 60,
    valueType: 'number',
    min: 0,
    max: 86400,
    requiresRestart: false,
  },
];

export class SettingsService {
  private inMemoryCache: Map<string, any> = new Map();
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      log.info('Initializing runtime settings catalog in MongoDB...');

      for (const def of SETTING_DEFINITIONS) {
        const existing = await SystemSetting.findOne({ key: def.key });
        if (!existing) {
          await SystemSetting.create({
            key: def.key,
            category: def.category,
            label: def.label,
            description: def.description,
            value: def.defaultValue,
            defaultValue: def.defaultValue,
            valueType: def.valueType,
            allowedValues: def.allowedValues,
            min: def.min,
            max: def.max,
            requiresRestart: def.requiresRestart || false,
            version: 1,
            updatedBy: 'system',
          });
          this.inMemoryCache.set(def.key, def.defaultValue);
        } else {
          this.inMemoryCache.set(def.key, existing.value);
        }
      }

      this.isInitialized = true;
      log.info({ count: SETTING_DEFINITIONS.length }, 'Settings catalog initialized successfully');
    } catch (err: any) {
      log.error({ err: err?.message }, 'Failed initializing settings catalog');
    }
  }

  setLocal(key: string, value: any): void {
    this.inMemoryCache.set(key, value);
  }

  async getSetting<T = any>(key: string, fallback?: T): Promise<T> {
    if (this.inMemoryCache.has(key)) {
      return this.inMemoryCache.get(key) as T;
    }

    if (mongoose.connection?.readyState === 1) {
      try {
        const doc = await SystemSetting.findOne({ key });
        if (doc) {
          this.inMemoryCache.set(key, doc.value);
          return doc.value as T;
        }
      } catch {
        // Fall back to definition default on error
      }
    }

    const def = SETTING_DEFINITIONS.find(d => d.key === key);
    if (def) {
      this.inMemoryCache.set(key, def.defaultValue);
      return def.defaultValue as T;
    }

    return fallback as T;
  }

  async isMaintenanceMode(): Promise<{ enabled: boolean; message: string }> {
    const enabled = await this.getSetting<boolean>('application.maintenanceMode', false);
    const message = await this.getSetting<string>(
      'application.maintenanceMessage',
      'TeleDrive is currently undergoing scheduled maintenance.'
    );
    return { enabled: Boolean(enabled), message };
  }

  async getAllSettings(): Promise<ISystemSetting[]> {
    return SystemSetting.find().sort({ category: 1, key: 1 });
  }

  async updateSetting(
    key: string,
    newValue: any,
    actorId: string,
    actorEmail: string,
    expectedVersion?: number
  ): Promise<ISystemSetting> {
    const setting = await SystemSetting.findOne({ key });
    if (!setting) {
      throw new ValidationError(`Unknown setting key: "${key}"`);
    }

    // Optimistic Concurrency Control
    if (typeof expectedVersion === 'number' && setting.version !== expectedVersion) {
      throw new AppError(
        `Setting "${key}" was modified by another administrator (version ${setting.version} != expected ${expectedVersion}). Please refresh and review.`,
        409,
        'CONCURRENCY_CONFLICT'
      );
    }

    // Type validation
    if (setting.valueType === 'number') {
      const num = Number(newValue);
      if (isNaN(num)) throw new ValidationError(`Value for ${key} must be a number`);
      if (typeof setting.min === 'number' && num < setting.min) {
        throw new ValidationError(`Value for ${key} cannot be less than ${setting.min}`);
      }
      if (typeof setting.max === 'number' && num > setting.max) {
        throw new ValidationError(`Value for ${key} cannot exceed ${setting.max}`);
      }
      newValue = num;
    } else if (setting.valueType === 'boolean') {
      newValue = Boolean(newValue);
    } else if (setting.allowedValues && setting.allowedValues.length > 0) {
      if (!setting.allowedValues.includes(newValue)) {
        throw new ValidationError(`Value for ${key} must be one of: ${setting.allowedValues.join(', ')}`);
      }
    }

    const oldValue = setting.value;
    setting.value = newValue;
    setting.version++;
    setting.updatedBy = actorEmail;
    await setting.save();

    this.inMemoryCache.set(key, newValue);

    // Record audit event
    await AuditLog.create({
      actorId,
      actorEmail,
      action: 'setting_updated',
      category: setting.category,
      resourceId: setting.key,
      changes: {
        before: oldValue,
        after: newValue,
      },
      status: 'success',
      details: {
        requiresRestart: setting.requiresRestart,
        version: setting.version,
      },
    }).catch(err => {
      log.warn({ err }, 'Failed writing audit log for setting update');
    });

    log.info({ key, oldValue, newValue, actorEmail }, 'System setting updated');
    return setting;
  }

  async resetCategory(category: SettingCategory, actorId: string, actorEmail: string): Promise<void> {
    const settings = await SystemSetting.find({ category });
    for (const s of settings) {
      const before = s.value;
      s.value = s.defaultValue;
      s.version++;
      s.updatedBy = actorEmail;
      await s.save();
      this.inMemoryCache.set(s.key, s.defaultValue);

      await AuditLog.create({
        actorId,
        actorEmail,
        action: 'setting_reset_default',
        category,
        resourceId: s.key,
        changes: { before, after: s.defaultValue },
        status: 'success',
      }).catch(() => {});
    }
  }

  async resetAll(actorId: string, actorEmail: string): Promise<void> {
    const settings = await SystemSetting.find();
    for (const s of settings) {
      s.value = s.defaultValue;
      s.version++;
      s.updatedBy = actorEmail;
      await s.save();
      this.inMemoryCache.set(s.key, s.defaultValue);
    }

    await AuditLog.create({
      actorId,
      actorEmail,
      action: 'all_settings_reset_default',
      category: 'application',
      status: 'success',
    }).catch(() => {});
  }
}

export const settingsService = new SettingsService();
