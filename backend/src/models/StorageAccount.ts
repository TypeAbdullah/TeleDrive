import mongoose, { Schema, Document } from 'mongoose';

export interface IStorageAccount extends Document {
  label: string;
  type: 'bot' | 'user';
  botToken?: string;
  encryptedSession?: string;
  apiId?: number;
  apiHash?: string;
  status: 'active' | 'cooldown' | 'error' | 'disabled';
  floodWaitUntil?: Date | null;
  errorCount: number;
  lastHealthCheck?: Date | null;
  lastSuccessfulOp?: Date | null;
  activeUploads: number;
  activeDownloads: number;
  totalBytesStored: number;
  priority: number;
  storagePeerId: string | number; // Target channel or Saved Messages
  createdAt: Date;
  updatedAt: Date;
}

const storageAccountSchema = new Schema<IStorageAccount>(
  {
    label: { type: String, required: true, trim: true },
    type: { type: String, enum: ['bot', 'user'], default: 'bot' },
    botToken: { type: String },
    encryptedSession: { type: String },
    apiId: { type: Number },
    apiHash: { type: String },
    status: {
      type: String,
      enum: ['active', 'cooldown', 'error', 'disabled'],
      default: 'active',
      index: true,
    },
    floodWaitUntil: { type: Date, default: null },
    errorCount: { type: Number, default: 0 },
    lastHealthCheck: { type: Date, default: null },
    lastSuccessfulOp: { type: Date, default: null },
    activeUploads: { type: Number, default: 0 },
    activeDownloads: { type: Number, default: 0 },
    totalBytesStored: { type: Number, default: 0 },
    priority: { type: Number, default: 1 },
    storagePeerId: { type: Schema.Types.Mixed, default: 'me' },
  },
  {
    timestamps: true,
  }
);

export const StorageAccount = mongoose.model<IStorageAccount>(
  'StorageAccount',
  storageAccountSchema
);
