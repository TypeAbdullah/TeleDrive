import mongoose, { Schema, Document } from 'mongoose';

export interface IFolder extends Document {
  userId: string;
  parentId: string | null;
  name: string;
  color: string;
  isTrash: boolean;
  trashedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const folderSchema = new Schema<IFolder>(
  {
    userId: { type: String, required: true, index: true },
    parentId: { type: String, default: null, index: true },
    name: { type: String, required: true, trim: true },
    color: { type: String, default: '#6366f1' },
    isTrash: { type: Boolean, default: false, index: true },
    trashedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

folderSchema.index({ userId: 1, parentId: 1, isTrash: 1 });
folderSchema.index({ userId: 1, name: 1, parentId: 1 });

export const Folder = mongoose.model<IFolder>('Folder', folderSchema);
