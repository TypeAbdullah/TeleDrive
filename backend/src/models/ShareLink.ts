import mongoose, { Schema, Document } from 'mongoose';

export interface IShareLink extends Document {
  token: string;
  fileId: mongoose.Types.ObjectId;
  userId: string;
  accessType: 'public' | 'password';
  passwordHash?: string;
  expiresAt?: Date | null;
  maxDownloads?: number | null;
  downloadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const shareLinkSchema = new Schema<IShareLink>(
  {
    token: { type: String, required: true, unique: true, index: true },
    fileId: { type: Schema.Types.ObjectId, ref: 'File', required: true, index: true },
    userId: { type: String, required: true },
    accessType: { type: String, enum: ['public', 'password'], default: 'public' },
    passwordHash: { type: String },
    expiresAt: { type: Date, default: null },
    maxDownloads: { type: Number, default: null },
    downloadCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

export const ShareLink = mongoose.model<IShareLink>('ShareLink', shareLinkSchema);
