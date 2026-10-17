import { nanoid } from 'nanoid';
import { ApiKey, IApiKey } from '../models/ApiKey.js';
import { hashSecret } from '../shared/crypto.js';
import { ValidationError, UnauthorizedError } from '../shared/errors.js';

export class DeveloperService {
  async createApiKey(userId: string, name: string, scopes: string[] = ['read', 'write']): Promise<{
    apiKey: IApiKey;
    secretKey: string;
  }> {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new ValidationError('API key name is required');
    }

    const keyId = `td_live_${nanoid(28)}`;
    const hashedSecret = hashSecret(keyId);

    const apiKey = await ApiKey.create({
      keyId,
      hashedSecret,
      userId,
      name: trimmed,
      scopes,
    });

    return {
      apiKey,
      secretKey: keyId, // Returned only once at creation!
    };
  }

  async listApiKeys(userId: string): Promise<any[]> {
    const keys = await ApiKey.find({ userId }).sort({ createdAt: -1 }).lean();
    return keys.map(k => ({
      ...k,
      hashedSecret: undefined,
      keyPreview: k.keyId.slice(0, 12) + '••••••••',
    }));
  }

  async revokeApiKey(userId: string, keyId: string): Promise<void> {
    await ApiKey.findOneAndDelete({ keyId, userId });
  }

  async validateKey(rawKey: string): Promise<IApiKey> {
    const hashed = hashSecret(rawKey);
    const keyRecord = await ApiKey.findOne({ hashedSecret: hashed });

    if (!keyRecord) {
      throw new UnauthorizedError('Invalid or revoked API key');
    }

    if (keyRecord.expiresAt && new Date() > keyRecord.expiresAt) {
      throw new UnauthorizedError('This API key has expired');
    }

    // Update lastUsedAt asynchronously
    ApiKey.findByIdAndUpdate(keyRecord._id, { lastUsedAt: new Date() }).exec().catch(() => {});

    return keyRecord;
  }
}

export const developerService = new DeveloperService();
