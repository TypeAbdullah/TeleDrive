import mongoose, { Schema, Document } from 'mongoose';
import { IFileChunk } from './File.js';

export interface IUploadJob extends Document {
  jobId: string;
  userId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  folderId: string | null;
  totalParts: number;
  uploadedParts: number[];
  partSize: number;
  status: 'pending' | 'uploading' | 'assembling' | 'completed' | 'failed' | 'cancelled';
  accountId?: string;
  chunks: IFileChunk[];
  error?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const uploadJobSchema = new Schema<IUploadJob>(
  {
    jobId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    mimeType: { type: String, default: 'application/octet-stream' },
    folderId: { type: String, default: null },
    totalParts: { type: Number, required: true },
    uploadedParts: [{ type: Number }],
    partSize: { type: Number, default: 524288 }, // 512 KB
    status: {
      type: String,
      enum: ['pending', 'uploading', 'assembling', 'completed', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    accountId: { type: String },
    chunks: [
      {
        partIndex: { type: Number, required: true },
        messageId: { type: Number, required: true },
        fileId: { type: String, required: true },
        size: { type: Number, required: true },
        checksum: { type: String },
      },
    ],
    error: { type: String },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }, // TTL index
  },
  {
    timestamps: true,
  }
);

export const UploadJob = mongoose.model<IUploadJob>('UploadJob', uploadJobSchema);
