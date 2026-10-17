import {
  AdminOverview,
  AdminSystemSetting,
  AdminTelegramSession,
  AdminGatewayInfo,
  AdminCacheInfo,
  AdminDatabaseInfo,
  AdminDeveloperKey,
  AdminJobInfo,
  AdminAuditLog,
} from '../types/admin';

async function fetchAdmin<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) {
    throw new Error(body.error?.message || `Request failed with status ${res.status}`);
  }

  return body.data as T;
}

export const adminApi = {
  // ── Overview ────────────────────────────────────────────────────────────
  async getOverview(): Promise<AdminOverview> {
    return fetchAdmin<AdminOverview>('/api/v1/admin/overview');
  },

  // ── Settings ────────────────────────────────────────────────────────────
  async getSettings(): Promise<AdminSystemSetting[]> {
    return fetchAdmin<AdminSystemSetting[]>('/api/v1/admin/settings');
  },

  async updateSetting(key: string, value: any, expectedVersion?: number): Promise<AdminSystemSetting> {
    return fetchAdmin<AdminSystemSetting>('/api/v1/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({ key, value, expectedVersion }),
    });
  },

  async resetSettings(category?: string): Promise<AdminSystemSetting[]> {
    return fetchAdmin<AdminSystemSetting[]>('/api/v1/admin/settings/reset', {
      method: 'POST',
      body: JSON.stringify({ category }),
    });
  },

  // ── Telegram Sessions ───────────────────────────────────────────────────
  async getTelegramSessions(): Promise<AdminTelegramSession[]> {
    return fetchAdmin<AdminTelegramSession[]>('/api/v1/admin/telegram/sessions');
  },

  async addTelegramSession(data: {
    label: string;
    botToken?: string;
    apiId?: number;
    apiHash?: string;
    storagePeerId?: string;
    priority?: number;
  }): Promise<any> {
    return fetchAdmin('/api/v1/admin/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async toggleTelegramSession(id: string, status: 'active' | 'disabled'): Promise<any> {
    return fetchAdmin(`/api/v1/admin/accounts/${id}/toggle`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async deleteTelegramSession(id: string): Promise<void> {
    await fetchAdmin(`/api/v1/admin/accounts/${id}`, { method: 'DELETE' });
  },

  async testTelegramSession(id: string): Promise<{ latencyMs: number; isReady: boolean }> {
    return fetchAdmin(`/api/v1/admin/telegram/sessions/${id}/test`, { method: 'POST' });
  },

  async reconnectTelegramSession(id: string): Promise<void> {
    await fetchAdmin(`/api/v1/admin/telegram/sessions/${id}/reconnect`, { method: 'POST' });
  },

  // ── Cloudflare Gateway ──────────────────────────────────────────────────
  async getGateway(): Promise<AdminGatewayInfo> {
    return fetchAdmin<AdminGatewayInfo>('/api/v1/admin/gateway');
  },

  async testGateway(): Promise<{
    status: string;
    httpStatus?: number;
    latencyMs: number;
    testedUrl: string;
    error?: string;
  }> {
    return fetchAdmin('/api/v1/admin/gateway/test', { method: 'POST' });
  },

  // ── Cache & Performance ─────────────────────────────────────────────────
  async getCache(): Promise<AdminCacheInfo> {
    return fetchAdmin<AdminCacheInfo>('/api/v1/admin/cache');
  },

  async clearCache(): Promise<void> {
    await fetchAdmin('/api/v1/admin/cache/clear', { method: 'POST' });
  },

  // ── Database ────────────────────────────────────────────────────────────
  async getDatabase(): Promise<AdminDatabaseInfo> {
    return fetchAdmin<AdminDatabaseInfo>('/api/v1/admin/database');
  },

  // ── Developer API Keys ──────────────────────────────────────────────────
  async getDeveloperKeys(): Promise<AdminDeveloperKey[]> {
    return fetchAdmin<AdminDeveloperKey[]>('/api/v1/admin/developer-api/keys');
  },

  async createDeveloperKey(data: {
    name: string;
    scopes?: string[];
    rateLimit?: number;
  }): Promise<{ keyId: string; rawApiKey: string; name: string; scopes: string[] }> {
    return fetchAdmin('/api/v1/admin/developer-api/keys', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async revokeDeveloperKey(keyId: string): Promise<void> {
    await fetchAdmin(`/api/v1/admin/developer-api/keys/${keyId}`, { method: 'DELETE' });
  },

  // ── Maintenance Jobs ────────────────────────────────────────────────────
  async getJobs(): Promise<AdminJobInfo[]> {
    return fetchAdmin<AdminJobInfo[]>('/api/v1/admin/jobs');
  },

  async runJob(jobId: string): Promise<{ message: string; result: any }> {
    return fetchAdmin(`/api/v1/admin/jobs/${jobId}/run`, { method: 'POST' });
  },

  // ── Audit Logs ──────────────────────────────────────────────────────────
  async getAuditLogs(page = 1, limit = 50, category?: string): Promise<{
    items: AdminAuditLog[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const q = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (category) q.set('category', category);
    return fetchAdmin(`/api/v1/admin/audit?${q.toString()}`);
  },
};
