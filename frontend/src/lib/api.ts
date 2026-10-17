import { TeleFile, TeleFolder, BreadcrumbItem, StorageStats, StorageAccountInfo, ApiKeyInfo } from '../types';

async function fetchJSON<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });

  const body = await res.json();
  if (!res.ok || !body.success) {
    throw new Error(body.error?.message || 'Request failed');
  }

  return body.data as T;
}

export const api = {
  // ── Files ─────────────────────────────────────────────────────────────
  async getFiles(params: {
    folderId?: string | null;
    filter?: 'all' | 'starred' | 'trash' | 'recent';
    search?: string;
  } = {}): Promise<TeleFile[]> {
    const query = new URLSearchParams();
    if (params.folderId) query.set('folderId', params.folderId);
    if (params.filter) query.set('filter', params.filter);
    if (params.search) query.set('search', params.search);

    return fetchJSON<TeleFile[]>(`/api/v1/files?${query.toString()}`);
  },

  async getStorageStats(): Promise<StorageStats> {
    return fetchJSON<StorageStats>('/api/v1/files/stats');
  },

  async renameFile(id: string, name: string): Promise<TeleFile> {
    return fetchJSON<TeleFile>(`/api/v1/files/${id}/rename`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    });
  },

  async moveFile(id: string, folderId: string | null): Promise<TeleFile> {
    return fetchJSON<TeleFile>(`/api/v1/files/${id}/move`, {
      method: 'PATCH',
      body: JSON.stringify({ folderId }),
    });
  },

  async toggleStar(id: string): Promise<TeleFile> {
    return fetchJSON<TeleFile>(`/api/v1/files/${id}/star`, {
      method: 'POST',
    });
  },

  async trashFile(id: string): Promise<void> {
    await fetchJSON(`/api/v1/files/${id}/trash`, { method: 'POST' });
  },

  async restoreFile(id: string): Promise<void> {
    await fetchJSON(`/api/v1/files/${id}/restore`, { method: 'POST' });
  },

  async deleteFile(id: string): Promise<void> {
    await fetchJSON(`/api/v1/files/${id}`, { method: 'DELETE' });
  },

  // ── Folders ───────────────────────────────────────────────────────────
  async getFolders(parentId?: string | null): Promise<TeleFolder[]> {
    const query = parentId ? `?parentId=${parentId}` : '';
    return fetchJSON<TeleFolder[]>(`/api/v1/folders${query}`);
  },

  async getBreadcrumbs(folderId?: string | null): Promise<BreadcrumbItem[]> {
    const query = folderId ? `?folderId=${folderId}` : '';
    return fetchJSON<BreadcrumbItem[]>(`/api/v1/folders/breadcrumbs${query}`);
  },

  async createFolder(name: string, parentId?: string | null, color?: string): Promise<TeleFolder> {
    return fetchJSON<TeleFolder>('/api/v1/folders', {
      method: 'POST',
      body: JSON.stringify({ name, parentId, color }),
    });
  },

  async renameFolder(id: string, name: string): Promise<TeleFolder> {
    return fetchJSON<TeleFolder>(`/api/v1/folders/${id}/rename`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    });
  },

  async trashFolder(id: string): Promise<void> {
    await fetchJSON(`/api/v1/folders/${id}/trash`, { method: 'POST' });
  },

  async restoreFolder(id: string): Promise<void> {
    await fetchJSON(`/api/v1/folders/${id}/restore`, { method: 'POST' });
  },

  async deleteFolder(id: string): Promise<void> {
    await fetchJSON(`/api/v1/folders/${id}`, { method: 'DELETE' });
  },

  // ── Upload ────────────────────────────────────────────────────────────
  async uploadFile(
    file: File,
    folderId?: string | null,
    onProgress?: (percent: number) => void
  ): Promise<TeleFile> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);
      if (folderId) formData.append('folderId', folderId);

      xhr.open('POST', '/api/v1/upload/direct');
      xhr.withCredentials = true;

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        try {
          const body = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300 && body.success) {
            resolve(body.data);
          } else {
            reject(new Error(body.error?.message || 'Upload failed'));
          }
        } catch {
          reject(new Error('Invalid server response'));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(formData);
    });
  },

  // ── Shares ────────────────────────────────────────────────────────────
  async createShare(params: {
    fileId: string;
    accessType?: 'public' | 'password';
    password?: string;
    expiresInDays?: number;
    maxDownloads?: number;
  }): Promise<{ shareUrl: string; shareLink: any }> {
    return fetchJSON('/api/v1/shares', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async getFileShares(fileId: string): Promise<any[]> {
    return fetchJSON<any[]>(`/api/v1/shares/file/${fileId}`);
  },

  async revokeShare(id: string): Promise<void> {
    await fetchJSON(`/api/v1/shares/${id}`, { method: 'DELETE' });
  },

  // ── Admin / Storage Accounts ──────────────────────────────────────────
  async getAccounts(): Promise<StorageAccountInfo[]> {
    return fetchJSON<StorageAccountInfo[]>('/api/v1/admin/accounts');
  },

  async addAccount(data: {
    label: string;
    botToken?: string;
    apiId?: number;
    apiHash?: string;
    storagePeerId?: string;
  }): Promise<StorageAccountInfo> {
    return fetchJSON<StorageAccountInfo>('/api/v1/admin/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async toggleAccount(id: string, status: 'active' | 'disabled'): Promise<StorageAccountInfo> {
    return fetchJSON<StorageAccountInfo>(`/api/v1/admin/accounts/${id}/toggle`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async deleteAccount(id: string): Promise<void> {
    await fetchJSON(`/api/v1/admin/accounts/${id}`, { method: 'DELETE' });
  },

  // ── Developer API Keys ─────────────────────────────────────────────────
  async getApiKeys(): Promise<ApiKeyInfo[]> {
    return fetchJSON<ApiKeyInfo[]>('/api/v1/developer/keys');
  },

  async createApiKey(name: string, scopes: string[] = ['read', 'write']): Promise<{ secretKey: string; apiKey: ApiKeyInfo }> {
    return fetchJSON('/api/v1/developer/keys', {
      method: 'POST',
      body: JSON.stringify({ name, scopes }),
    });
  },

  async revokeApiKey(keyId: string): Promise<void> {
    await fetchJSON(`/api/v1/developer/keys/${keyId}`, { method: 'DELETE' });
  },
};
