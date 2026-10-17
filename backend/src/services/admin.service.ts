import { StorageAccount, IStorageAccount } from '../models/StorageAccount.js';
import { File } from '../models/File.js';
import { accountPool } from '../infrastructure/telegram/pool.js';
import { scheduler } from '../infrastructure/telegram/scheduler.js';
import { encrypt } from '../shared/crypto.js';
import { ValidationError, NotFoundError } from '../shared/errors.js';

export class AdminService {
  async listAccounts(): Promise<any[]> {
    const dbAccounts = await StorageAccount.find().sort({ createdAt: -1 }).lean();
    const metrics = scheduler.getMetrics();

    return dbAccounts.map(acc => {
      const metric = metrics.find(m => m.accountId === acc._id.toString());
      return {
        ...acc,
        botToken: acc.botToken ? '••••••••' + acc.botToken.slice(-6) : undefined,
        inFlightUploads: metric?.inFlightUploads || 0,
        inFlightDownloads: metric?.inFlightDownloads || 0,
        isReady: metric?.isReady ?? (acc.status === 'active'),
      };
    });
  }

  async addAccount(params: {
    label: string;
    type?: 'bot' | 'user';
    botToken?: string;
    apiId?: number;
    apiHash?: string;
    storagePeerId?: string | number;
    priority?: number;
  }): Promise<IStorageAccount> {
    if (!params.label?.trim()) {
      throw new ValidationError('Account label is required');
    }

    let encryptedToken: string | undefined;
    if (params.botToken?.trim()) {
      encryptedToken = encrypt(params.botToken.trim());
    }

    const account = await StorageAccount.create({
      label: params.label.trim(),
      type: params.type || 'bot',
      botToken: encryptedToken,
      apiId: params.apiId,
      apiHash: params.apiHash,
      storagePeerId: params.storagePeerId || 'me',
      priority: params.priority || 1,
      status: 'active',
    });

    // Sync newly created account into memory pool
    await accountPool.syncAccountsFromDB();

    return account;
  }

  async toggleAccount(accountId: string, status: 'active' | 'disabled'): Promise<IStorageAccount> {
    const acc = await StorageAccount.findByIdAndUpdate(
      accountId,
      { status },
      { new: true }
    );
    if (!acc) {
      throw new NotFoundError('Storage account');
    }
    await accountPool.syncAccountsFromDB();
    return acc;
  }

  async deleteAccount(accountId: string): Promise<void> {
    await StorageAccount.findByIdAndDelete(accountId);
  }

  async getSystemStats(): Promise<{
    totalFiles: number;
    totalStorageBytes: number;
    accountCount: number;
    activePoolSize: number;
  }> {
    const [totalFiles, agg] = await Promise.all([
      File.countDocuments({ isTrash: false }),
      File.aggregate([
        { $match: { isTrash: false } },
        { $group: { _id: null, totalBytes: { $sum: '$size' } } },
      ]),
    ]);

    const totalStorageBytes = agg[0]?.totalBytes || 0;
    const accountCount = await StorageAccount.countDocuments();
    const activePoolSize = accountPool.getHealthyClients().length;

    return {
      totalFiles,
      totalStorageBytes,
      accountCount,
      activePoolSize,
    };
  }
}

export const adminService = new AdminService();
