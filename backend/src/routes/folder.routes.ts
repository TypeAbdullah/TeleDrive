import { Router, Request, Response, NextFunction } from 'express';
import { folderService } from '../services/folder.service.js';
import { sendSuccess } from '../shared/response.js';

export const folderRouter = Router();

folderRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.authUser!.id;
    const parentId = req.query.parentId === 'root' || !req.query.parentId ? null : (req.query.parentId as string);
    const folders = await folderService.listFolders(userId, parentId);
    sendSuccess(res, folders);
  } catch (err) {
    next(err);
  }
});

folderRouter.get('/breadcrumbs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.authUser!.id;
    const folderId = req.query.folderId === 'root' || !req.query.folderId ? null : (req.query.folderId as string);
    const crumbs = await folderService.getBreadcrumbs(userId, folderId);
    sendSuccess(res, crumbs);
  } catch (err) {
    next(err);
  }
});

folderRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.authUser!.id;
    const { name, parentId, color } = req.body;
    const folder = await folderService.createFolder(
      userId,
      name,
      parentId === 'root' || !parentId ? null : parentId,
      color
    );
    sendSuccess(res, folder, 201);
  } catch (err) {
    next(err);
  }
});

folderRouter.patch('/:id/rename', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.authUser!.id;
    const { name } = req.body;
    const folder = await folderService.renameFolder(userId, req.params.id as string, name);
    sendSuccess(res, folder);
  } catch (err) {
    next(err);
  }
});

folderRouter.post('/:id/trash', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.authUser!.id;
    await folderService.trashFolder(userId, req.params.id as string);
    sendSuccess(res, { message: 'Folder moved to trash' });
  } catch (err) {
    next(err);
  }
});

folderRouter.post('/:id/restore', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.authUser!.id;
    await folderService.restoreFolder(userId, req.params.id as string);
    sendSuccess(res, { message: 'Folder restored' });
  } catch (err) {
    next(err);
  }
});

folderRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.authUser!.id;
    await folderService.deletePermanently(userId, req.params.id as string);
    sendSuccess(res, { message: 'Folder permanently deleted' });
  } catch (err) {
    next(err);
  }
});
