import { File, IFile } from '../models/File.js';
import { UserMeta } from '../models/UserMeta.js';
import { accountPool } from '../infrastructure/telegram/pool.js';
import { ValidationError, NotFoundError } from '../shared/errors.js';

export interface ListFilesOptions {
  folderId?: string | null;
  filter?: 'all' | 'starred' | 'trash' | 'recent';
  search?: string;
  sortBy?: 'name' | 'size' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export class FileService {
  async listFiles(userId: string, options: ListFilesOptions = {}): Promise<IFile[]> {
    const query: any = { userId };

    if (options.filter === 'trash') {
      query.isTrash = true;
    } else {
      query.isTrash = false;

      if (options.filter === 'starred') {
        query.isStarred = true;
      } else if (options.filter === 'recent') {
        // Will sort by updatedAt desc
      } else if (options.folderId !== undefined) {
        query.folderId = options.folderId;
      }
    }

    if (options.search) {
      query.name = { $regex: options.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    }

    const sortField = options.sortBy || 'createdAt';
    const sortDir = options.sortOrder === 'asc' ? 1 : -1;

    return File.find(query).sort({ [sortField]: sortDir }).limit(500);
  }

  async getFileById(userId: string, fileId: string): Promise<IFile> {
    const file = await File.findOne({ _id: fileId, userId });
    if (!file) {
      throw new NotFoundError('File');
    }
    return file;
  }

  async renameFile(userId: string, fileId: string, newName: string): Promise<IFile> {
    const trimmed = newName.trim();
    if (!trimmed) {
      throw new ValidationError('File name cannot be empty');
    }

    const file = await File.findOneAndUpdate(
      { _id: fileId, userId, isTrash: false },
      { name: trimmed },
      { new: true }
    );

    if (!file) {
      throw new NotFoundError('File');
    }

    return file;
  }

  async moveFile(userId: string, fileId: string, folderId: string | null): Promise<IFile> {
    const file = await File.findOneAndUpdate(
      { _id: fileId, userId, isTrash: false },
      { folderId },
      { new: true }
    );

    if (!file) {
      throw new NotFoundError('File');
    }

    return file;
  }

  async toggleStar(userId: string, fileId: string): Promise<IFile> {
    const file = await File.findOne({ _id: fileId, userId });
    if (!file) {
      throw new NotFoundError('File');
    }

    file.isStarred = !file.isStarred;
    await file.save();
    return file;
  }

  async trashFile(userId: string, fileId: string): Promise<void> {
    const file = await File.findOneAndUpdate(
      { _id: fileId, userId },
      { isTrash: true, trashedAt: new Date() }
    );

    if (!file) {
      throw new NotFoundError('File');
    }
  }

  async restoreFile(userId: string, fileId: string): Promise<void> {
    const file = await File.findOneAndUpdate(
      { _id: fileId, userId },
      { isTrash: false, trashedAt: null }
    );

    if (!file) {
      throw new NotFoundError('File');
    }
  }

  async deletePermanently(userId: string, fileId: string): Promise<void> {
    const file = await File.findOne({ _id: fileId, userId });
    if (!file) {
      throw new NotFoundError('File');
    }

    // Delete Telegram messages
    if (file.storageRef) {
      const client = accountPool.getClient(file.storageRef.accountId);
      if (file.storageRef.chunks && file.storageRef.chunks.length > 0) {
        for (const chunk of file.storageRef.chunks) {
          await client.deleteMessage(chunk.messageId).catch(() => {});
        }
      } else if (file.storageRef.messageId) {
        await client.deleteMessage(file.storageRef.messageId).catch(() => {});
      }
    }

    await File.deleteOne({ _id: fileId });

    // Decrement user quota
    await UserMeta.findOneAndUpdate(
      { userId },
      { $inc: { usedBytes: -file.size } }
    ).catch(() => {});
  }

  async getUserStorageStats(userId: string): Promise<{
    usedBytes: number;
    quotaBytes: number;
    percentUsed: number;
    fileCount: number;
  }> {
    let meta = await UserMeta.findOne({ userId });
    if (!meta) {
      meta = await UserMeta.create({ userId });
    }

    const files = await File.find({ userId, isTrash: false }).select('size').lean();
    const actualUsed = files.reduce((acc, f) => acc + (f.size || 0), 0);

    return {
      usedBytes: actualUsed,
      quotaBytes: meta.quotaBytes,
      percentUsed: Math.min(100, Math.round((actualUsed / meta.quotaBytes) * 100)),
      fileCount: files.length,
    };
  }
}

export const fileService = new FileService();
