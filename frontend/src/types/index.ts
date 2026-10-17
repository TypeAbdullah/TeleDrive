export interface TeleUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role?: 'admin' | 'user';
}

export interface StorageStats {
  usedBytes: number;
  quotaBytes: number;
  percentUsed: number;
  fileCount: number;
}

export interface TeleFile {
  _id: string;
  userId: string;
  folderId: string | null;
  name: string;
  size: number;
  mimeType: string;
  status: 'uploading' | 'ready' | 'trashed' | 'deleted' | 'error';
  isStarred: boolean;
  isTrash: boolean;
  trashedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeleFolder {
  _id: string;
  userId: string;
  parentId: string | null;
  name: string;
  color: string;
  isTrash: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BreadcrumbItem {
  id: string;
  name: string;
}

export interface StorageAccountInfo {
  _id: string;
  label: string;
  type: 'bot' | 'user';
  status: 'active' | 'cooldown' | 'error' | 'disabled';
  totalBytesStored: number;
  errorCount: number;
  inFlightUploads: number;
  inFlightDownloads: number;
  isReady: boolean;
  storagePeerId: string | number;
  createdAt: string;
}

export interface ApiKeyInfo {
  _id: string;
  keyId: string;
  name: string;
  scopes: string[];
  keyPreview: string;
  lastUsedAt?: string | null;
  createdAt: string;
}

export interface UploadQueueItem {
  id: string;
  file: File;
  name: string;
  size: number;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}
