export interface StorageRef {
  accountId: string;
  peerId: number | string;
  messageId: number;
  fileId: string;
  uniqueFileId?: string;
  chunks?: {
    partIndex: number;
    messageId: number;
    fileId: string;
    size: number;
    checksum?: string;
  }[];
}

export interface UploadOptions {
  fileName: string;
  mimeType: string;
  fileSize: number;
  buffer?: Buffer;
  filePath?: string;
  onProgress?: (uploaded: number, total: number) => void;
}

export interface AccountStats {
  accountId: string;
  label: string;
  type: 'bot' | 'user';
  status: 'active' | 'cooldown' | 'error' | 'disabled';
  activeUploads: number;
  activeDownloads: number;
  totalBytesStored: number;
  floodWaitUntil?: Date | null;
  errorCount: number;
  lastHealthCheck?: Date | null;
}
