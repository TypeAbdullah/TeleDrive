import mongoose, { Schema, Document } from 'mongoose';

export interface IApiKey extends Document {
  keyId: string;
  hashedSecret: string;
  userId: string;
  name: string;
  scopes: string[];
  rateLimit: number;
  lastUsedAt?: Date | null;
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const apiKeySchema = new Schema<IApiKey>(
  {
    keyId: { type: String, required: true, unique: true, index: true },
    hashedSecret: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    scopes: [{ type: String, default: 'read' }],
    rateLimit: { type: Number, default: 60 },
    lastUsedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

export const ApiKey = mongoose.model<IApiKey>('ApiKey', apiKeySchema);
