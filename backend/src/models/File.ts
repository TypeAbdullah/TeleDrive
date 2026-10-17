import mongoose, { Schema, Document } from 'mongoose';

export interface IFileChunk {
  partIndex: number;
  messageId: number;
  fileId: string;
  size: number;
  checksum?: string;
}

export interface IStorageRef {
  accountId: string;
  peerId: number | string;
  messageId: number;
  fileId: string;
  uniqueFileId?: string;
  chunks?: IFileChunk[];
}

export interface IFile extends Document {
  userId: string;
  folderId: string | null;
  name: string;
  size: number;
  mimeType: string;
  checksum?: string;
  status: 'uploading' | 'ready' | 'trashed' | 'deleted' | 'error';
  isStarred: boolean;
  isTrash: boolean;
  trashedAt: Date | null;
  storageRef?: IStorageRef;
  createdAt: Date;
  updatedAt: Date;
}

const fileChunkSchema = new Schema<IFileChunk>(
  {
    partIndex: { type: Number, required: true },
    messageId: { type: Number, required: true },
    fileId: { type: String, required: true },
    size: { type: Number, required: true },
    checksum: { type: String },
  },
  { _id: false }
);

const storageRefSchema = new Schema<IStorageRef>(
  {
    accountId: { type: String, required: true },
    peerId: { type: Schema.Types.Mixed, required: true },
    messageId: { type: Number, required: true },
    fileId: { type: String, required: true },
    uniqueFileId: { type: String },
    chunks: [fileChunkSchema],
  },
  { _id: false }
);

const fileSchema = new Schema<IFile>(
  {
    userId: { type: String, required: true, index: true },
    folderId: { type: String, default: null, index: true },
    name: { type: String, required: true, trim: true },
    size: { type: Number, required: true },
    mimeType: { type: String, default: 'application/octet-stream' },
    checksum: { type: String },
    status: {
      type: String,
      enum: ['uploading', 'ready', 'trashed', 'deleted', 'error'],
      default: 'ready',
      index: true,
    },
    isStarred: { type: Boolean, default: false, index: true },
    isTrash: { type: Boolean, default: false, index: true },
    trashedAt: { type: Date, default: null },
    storageRef: { type: storageRefSchema, default: null },
  },
  {
    timestamps: true,
  }
);

fileSchema.index({ userId: 1, folderId: 1, isTrash: 1 });
fileSchema.index({ userId: 1, isStarred: 1 });
fileSchema.index({ userId: 1, isTrash: 1 });
fileSchema.index({ userId: 1, name: 'text' });

export const File = mongoose.model<IFile>('File', fileSchema);
