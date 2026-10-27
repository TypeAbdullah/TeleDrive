import fs from 'fs';
import path from 'path';
import { TelegramClient } from '@mtcute/node';
import { createModuleLogger } from '../../shared/logger.js';
import { UploadOptions } from './types.js';

const log = createModuleLogger('telegram-client');

export interface ITelegramClientAdapter {
  accountId: string;
  label: string;
  isReady: boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  uploadChunk(options: UploadOptions): Promise<{ messageId: number; fileId: string }>;
  downloadStream(fileId: string, messageId: number, range?: { start?: number; end?: number }): Promise<NodeJS.ReadableStream>;
  deleteMessage(messageId: number): Promise<void>;
}

/**
 * Concrete adapter for Telegram MTProto via @mtcute/node
 */
export class MtcuteClientAdapter implements ITelegramClientAdapter {
  public accountId: string;
  public label: string;
  public isReady = false;
  private client: TelegramClient | null = null;
  private peerId: string | number;
  private botToken?: string;
  private apiId: number;
  private apiHash: string;

  constructor(params: {
    accountId: string;
    label: string;
    apiId: number;
    apiHash: string;
    botToken?: string;
    session?: string;
    peerId: string | number;
  }) {
    this.accountId = params.accountId;
    this.label = params.label;
    this.apiId = params.apiId;
    this.apiHash = params.apiHash;
    this.botToken = params.botToken;
    this.peerId = params.peerId || 'me';
  }

  async connect(): Promise<void> {
    try {
      log.info({ accountId: this.accountId, label: this.label }, 'Initializing MTcute client...');
      this.client = new TelegramClient({
        apiId: this.apiId,
        apiHash: this.apiHash,
        storage: `.storage_session_${this.accountId}`,
      });

      if (this.botToken) {
        await this.client.start({ botToken: this.botToken });
      } else {
        await this.client.start();
      }

      this.isReady = true;
      log.info({ accountId: this.accountId }, 'MTcute client connected successfully');
    } catch (err) {
      this.isReady = false;
      log.error({ err, accountId: this.accountId }, 'Failed to connect MTcute client');
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.isReady = false;
      log.info({ accountId: this.accountId }, 'MTcute client disconnected');
    }
  }

  async uploadChunk(options: UploadOptions): Promise<{ messageId: number; fileId: string }> {
    if (!this.client || !this.isReady) {
      throw new Error(`Telegram client [${this.accountId}] is not connected`);
    }

    try {
      const fileToUpload = options.filePath || options.buffer;
      if (!fileToUpload) {
        throw new Error('Neither filePath nor buffer was provided for upload');
      }

      // Send document to the target channel or 'me'
      const clientAny = this.client as any;
      const msg = typeof clientAny.sendDocument === 'function'
        ? await clientAny.sendDocument(this.peerId, fileToUpload, {
            fileName: options.fileName,
            mimeType: options.mimeType,
          })
        : await clientAny.sendMedia(this.peerId, {
            type: 'document',
            file: fileToUpload,
            fileName: options.fileName,
            mimeType: options.mimeType,
          });

      const rawFileId = (msg.media as any)?.document?.fileId || `msg_${msg.id}`;
      return {
        messageId: msg.id,
        fileId: rawFileId,
      };
    } catch (err: any) {
      log.error({ err, accountId: this.accountId }, 'Failed to upload chunk to Telegram');
      throw err;
    }
  }

  async downloadStream(fileId: string, messageId: number, range?: { start?: number; end?: number }): Promise<NodeJS.ReadableStream> {
    if (!this.client || !this.isReady) {
      throw new Error(`Telegram client [${this.accountId}] is not connected`);
    }

    try {
      const downloadParams: any = {};
      if (range) {
        if (typeof range.start === 'number') {
          downloadParams.offset = range.start;
        }
        if (typeof range.start === 'number' && typeof range.end === 'number') {
          downloadParams.limit = range.end - range.start + 1;
        }
      }
      const clientAny = this.client as any;
      const downloadFn = clientAny.downloadAsNodeStream || clientAny.downloadAsStream;
      const stream = await downloadFn.call(clientAny, fileId as any, downloadParams);
      return stream as unknown as NodeJS.ReadableStream;
    } catch (err) {
      log.error({ err, accountId: this.accountId, messageId }, 'Failed to download stream from Telegram');
      throw err;
    }
  }

  async deleteMessage(messageId: number): Promise<void> {
    if (!this.client || !this.isReady) return;
    try {
      const clientAny = this.client as any;
      if (typeof clientAny.deleteMessages === 'function') {
        await clientAny.deleteMessages(this.peerId, [messageId]);
      } else if (typeof clientAny.deleteMessagesById === 'function') {
        await clientAny.deleteMessagesById(this.peerId, [messageId]);
      }
    } catch (err) {
      log.warn({ err, accountId: this.accountId, messageId }, 'Failed to delete message on Telegram');
    }
  }
}

/**
 * Local file system storage fallback:
 * Used for development or when Telegram accounts are not yet attached.
 * Stores data in `./.local_storage/` with the identical interface.
 */
export class LocalStorageAdapter implements ITelegramClientAdapter {
  public accountId = 'local_storage';
  public label = 'Local Disk Engine (Dev Fallback)';
  public isReady = true;
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve(process.cwd(), '.local_storage');
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async connect(): Promise<void> {
    this.isReady = true;
    log.info('Local disk storage engine ready');
  }

  async disconnect(): Promise<void> {
    this.isReady = false;
  }

  async uploadChunk(options: UploadOptions): Promise<{ messageId: number; fileId: string }> {
    const messageId = Date.now() + Math.floor(Math.random() * 10000);
    const chunkPath = path.join(this.baseDir, `${messageId}.bin`);
    if (options.filePath) {
      await fs.promises.copyFile(options.filePath, chunkPath);
    } else if (options.buffer) {
      await fs.promises.writeFile(chunkPath, options.buffer);
    } else {
      throw new Error('Neither filePath nor buffer was provided for upload');
    }
    return {
      messageId,
      fileId: `local_${messageId}`,
    };
  }

  async downloadStream(_fileId: string, messageId: number, range?: { start?: number; end?: number }): Promise<NodeJS.ReadableStream> {
    const chunkPath = path.join(this.baseDir, `${messageId}.bin`);
    if (!fs.existsSync(chunkPath)) {
      throw new Error(`File chunk not found on storage: ${messageId}`);
    }
    const readOptions: { start?: number; end?: number } = {};
    if (range) {
      if (typeof range.start === 'number') readOptions.start = range.start;
      if (typeof range.end === 'number') readOptions.end = range.end;
    }
    return fs.createReadStream(chunkPath, readOptions);
  }

  async deleteMessage(messageId: number): Promise<void> {
    const chunkPath = path.join(this.baseDir, `${messageId}.bin`);
    if (fs.existsSync(chunkPath)) {
      await fs.promises.unlink(chunkPath).catch(() => {});
    }
  }
}
