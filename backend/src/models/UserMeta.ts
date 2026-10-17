import mongoose, { Schema, Document } from 'mongoose';

export interface IUserMeta extends Document {
  userId: string;
  role: 'admin' | 'user';
  discordUsername?: string;
  quotaBytes: number;
  usedBytes: number;
  createdAt: Date;
  updatedAt: Date;
}

const userMetaSchema = new Schema<IUserMeta>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
    discordUsername: { type: String, lowercase: true, trim: true, index: true },
    quotaBytes: { type: Number, default: 10 * 1024 * 1024 * 1024 }, // 10 GB
    usedBytes: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

export const UserMeta = mongoose.model<IUserMeta>('UserMeta', userMetaSchema);
