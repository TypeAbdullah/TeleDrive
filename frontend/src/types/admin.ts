export interface AdminOverview {
  system: {
    version: string;
    nodeEnv: string;
    uptimeSeconds: number;
    timestamp: string;
    maintenanceMode: boolean;
    maintenanceMessage: string;
  };
  memory: {
    rssBytes: number;
    heapUsedBytes: number;
    heapTotalBytes: number;
    externalBytes: number;
  };
  dependencies: {
    mongodb: { status: string; latencyMs?: number };
    redis: { status: string; latencyMs?: number };
    telegramPool: {
      healthyCount: number;
      totalCount: number;
      accounts: any[];
    };
    gateway: {
      url: string;
      enabled: boolean;
      tokenTtlSeconds: number;
    };
  };
  transfers: {
    activeTotal: number;
    activeUploads: number;
    activeDownloads: number;
    queueDepth: number;
    avgQueueWaitMs: number;
    totalCompleted: number;
    totalFailed: number;
    bytesStreamed: number;
    activeStreams: number;
  };
  storage: {
    totalFiles: number;
    totalBytesStored: number;
  };
  cache: {
    hits: number;
    misses: number;
    hitRatio: number;
    l1EntryCount: number;
  };
}

export interface AdminSystemSetting {
  _id: string;
  key: string;
  category: string;
  label: string;
  description: string;
  value: any;
  defaultValue: any;
  valueType: 'string' | 'number' | 'boolean' | 'json';
  allowedValues?: any[];
  min?: number;
  max?: number;
  requiresRestart: boolean;
  version: number;
  updatedBy: string;
  updatedAt: string;
}

export interface AdminTelegramSession {
  _id: string;
  label: string;
  type: 'bot' | 'user';
  botTokenMasked?: string;
  apiId?: number;
  status: 'active' | 'cooldown' | 'error' | 'disabled';
  score: number;
  circuitBreaker: 'closed' | 'open' | 'half-open';
  activeUploads: number;
  activeDownloads: number;
  avgLatencyMs: number;
  throughputBytesPerSec: number;
  consecutiveFailures: number;
  floodWaitUntil?: string | null;
  lastSuccessfulOp?: string | null;
  totalBytesStored: number;
  priority: number;
  storagePeerId: string | number;
}

export interface AdminGatewayInfo {
  gatewayUrl: string;
  enabled: boolean;
  tokenTtlSeconds: number;
  secrets: {
    primaryConfigured: boolean;
    rotationConfigured: boolean;
    internalConfigured: boolean;
  };
  diagnostics: {
    lastHealthCheck: string;
    status: string;
  };
}

export interface AdminCacheInfo {
  hits: number;
  misses: number;
  hitRatio: number;
  l1EntryCount: number;
  redisAvailable: boolean;
}

export interface AdminDatabaseInfo {
  mongodb: {
    status: string;
    latencyMs?: number;
    databaseName: string;
    collections: { name: string; count: number }[];
  };
  redis: {
    status: string;
    latencyMs?: number;
  };
}

export interface AdminDeveloperKey {
  keyId: string;
  name: string;
  userId: string;
  scopes: string[];
  rateLimit: number;
  lastUsedAt?: string | null;
  createdAt: string;
}

export interface AdminJobInfo {
  id: string;
  name: string;
  description: string;
  interval: string;
  status: string;
}

export interface AdminAuditLog {
  _id: string;
  actorId: string;
  actorEmail: string;
  action: string;
  category: string;
  resourceId?: string;
  changes?: {
    before?: any;
    after?: any;
  };
  status: 'success' | 'failure';
  errorMessage?: string;
  createdAt: string;
}
