import { nanoid } from 'nanoid';
import { ShareLink, IShareLink } from '../models/ShareLink.js';
import { File, IFile } from '../models/File.js';
import { hashSecret } from '../shared/crypto.js';
import { NotFoundError, GoneError, UnauthorizedError } from '../shared/errors.js';

export class ShareService {
  async createShareLink(params: {
    userId: string;
    fileId: string;
    accessType?: 'public' | 'password';
    password?: string;
    expiresInDays?: number;
    maxDownloads?: number;
  }): Promise<{ shareLink: IShareLink; shareUrl: string }> {
    const file = await File.findOne({ _id: params.fileId, userId: params.userId, isTrash: false });
    if (!file) {
      throw new NotFoundError('File');
    }

    const token = nanoid(24);
    let expiresAt: Date | null = null;
    if (params.expiresInDays && params.expiresInDays > 0) {
      expiresAt = new Date(Date.now() + params.expiresInDays * 24 * 60 * 60 * 1000);
    }

    let passwordHash: string | undefined;
    if (params.accessType === 'password' && params.password) {
      passwordHash = hashSecret(params.password);
    }

    const shareLink = await ShareLink.create({
      token,
      fileId: file._id,
      userId: params.userId,
      accessType: params.accessType || 'public',
      passwordHash,
      expiresAt,
      maxDownloads: params.maxDownloads || null,
    });

    const shareUrl = `/dl/${token}`;
    return { shareLink, shareUrl };
  }

  async getFileShares(userId: string, fileId: string): Promise<IShareLink[]> {
    return ShareLink.find({ userId, fileId }).sort({ createdAt: -1 });
  }

  async revokeShare(userId: string, shareId: string): Promise<void> {
    await ShareLink.findOneAndDelete({ _id: shareId, userId });
  }

  async resolveToken(token: string, passwordAttempt?: string): Promise<{ file: IFile; shareLink?: IShareLink; requiresPassword: boolean }> {
    const share = await ShareLink.findOne({ token });
    if (!share) {
      throw new NotFoundError('Share link');
    }

    if (share.expiresAt && new Date() > share.expiresAt) {
      throw new GoneError('This share link has expired');
    }

    if (share.maxDownloads && share.downloadCount >= share.maxDownloads) {
      throw new GoneError('Maximum download limit reached for this link');
    }

    if (share.accessType === 'password') {
      if (!passwordAttempt) {
        return { file: null as any, requiresPassword: true };
      }
      if (hashSecret(passwordAttempt) !== share.passwordHash) {
        throw new UnauthorizedError('Incorrect password for shared file');
      }
    }

    const file = await File.findById(share.fileId);
    if (!file || file.isTrash) {
      throw new NotFoundError('Shared file');
    }

    // Increment download count
    share.downloadCount += 1;
    await share.save();

    return { file, shareLink: share, requiresPassword: false };
  }
}

export const shareService = new ShareService();
