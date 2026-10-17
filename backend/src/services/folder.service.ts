import { Folder, IFolder } from '../models/Folder.js';
import { File } from '../models/File.js';
import { ValidationError, NotFoundError } from '../shared/errors.js';

export class FolderService {
  async createFolder(userId: string, name: string, parentId: string | null = null, color = '#6366f1'): Promise<IFolder> {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new ValidationError('Folder name cannot be empty');
    }

    if (parentId) {
      const parent = await Folder.findOne({ _id: parentId, userId, isTrash: false });
      if (!parent) {
        throw new NotFoundError('Parent folder');
      }
    }

    const folder = await Folder.create({
      userId,
      parentId,
      name: trimmed,
      color,
    });

    return folder;
  }

  async listFolders(userId: string, parentId: string | null = null): Promise<IFolder[]> {
    return Folder.find({
      userId,
      parentId,
      isTrash: false,
    }).sort({ name: 1 });
  }

  async getBreadcrumbs(userId: string, folderId: string | null): Promise<{ id: string; name: string }[]> {
    const crumbs: { id: string; name: string }[] = [];
    let currentId = folderId;

    while (currentId) {
      const folder = await Folder.findOne({ _id: currentId, userId }).lean();
      if (!folder) break;
      crumbs.unshift({ id: folder._id.toString(), name: folder.name });
      currentId = folder.parentId;
    }

    return crumbs;
  }

  async renameFolder(userId: string, folderId: string, name: string): Promise<IFolder> {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new ValidationError('Folder name cannot be empty');
    }

    const folder = await Folder.findOneAndUpdate(
      { _id: folderId, userId, isTrash: false },
      { name: trimmed },
      { new: true }
    );

    if (!folder) {
      throw new NotFoundError('Folder');
    }

    return folder;
  }

  async trashFolder(userId: string, folderId: string): Promise<void> {
    const folder = await Folder.findOne({ _id: folderId, userId });
    if (!folder) {
      throw new NotFoundError('Folder');
    }

    folder.isTrash = true;
    folder.trashedAt = new Date();
    await folder.save();

    // Mark contained files as trash as well
    await File.updateMany(
      { userId, folderId },
      { isTrash: true, trashedAt: new Date() }
    );
  }

  async restoreFolder(userId: string, folderId: string): Promise<void> {
    const folder = await Folder.findOne({ _id: folderId, userId });
    if (!folder) {
      throw new NotFoundError('Folder');
    }

    folder.isTrash = false;
    folder.trashedAt = null;
    await folder.save();

    await File.updateMany(
      { userId, folderId },
      { isTrash: false, trashedAt: null }
    );
  }

  async deletePermanently(userId: string, folderId: string): Promise<void> {
    await Folder.findOneAndDelete({ _id: folderId, userId });
  }
}

export const folderService = new FolderService();
