import { Router, Request, Response, NextFunction } from 'express';
import { fileService } from '../services/file.service.js';
import { sendSuccess } from '../shared/response.js';

export const fileRouter = Router();

fileRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.authUser!.id;
    const { folderId, filter, search, sortBy, sortOrder } = req.query;

    const files = await fileService.listFiles(userId, {
      folderId: folderId === 'root' || folderId === '' ? null : (folderId as string | undefined),
      filter: filter as any,
      search: search as string | undefined,
      sortBy: sortBy as any,
      sortOrder: sortOrder as any,
    });

    sendSuccess(res, files);
  } catch (err) {
    next(err);
  }
});

fileRouter.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.authUser!.id;
    const stats = await fileService.getUserStorageStats(userId);
    sendSuccess(res, stats);
  } catch (err) {
    next(err);
  }
});

fileRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.authUser!.id;
    const file = await fileService.getFileById(userId, req.params.id as string);
    sendSuccess(res, file);
  } catch (err) {
    next(err);
  }
});

fileRouter.patch('/:id/rename', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.authUser!.id;
    const { name } = req.body;
    const file = await fileService.renameFile(userId, req.params.id as string, name);
    sendSuccess(res, file);
  } catch (err) {
    next(err);
  }
});

fileRouter.patch('/:id/move', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.authUser!.id;
    const { folderId } = req.body;
    const file = await fileService.moveFile(userId, req.params.id as string, folderId || null);
    sendSuccess(res, file);
  } catch (err) {
    next(err);
  }
});

fileRouter.post('/:id/star', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.authUser!.id;
    const file = await fileService.toggleStar(userId, req.params.id as string);
    sendSuccess(res, file);
  } catch (err) {
    next(err);
  }
});

fileRouter.post('/:id/trash', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.authUser!.id;
    await fileService.trashFile(userId, req.params.id as string);
    sendSuccess(res, { message: 'File moved to trash' });
  } catch (err) {
    next(err);
  }
});

fileRouter.post('/:id/restore', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.authUser!.id;
    await fileService.restoreFile(userId, req.params.id as string);
    sendSuccess(res, { message: 'File restored' });
  } catch (err) {
    next(err);
  }
});

fileRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.authUser!.id;
    await fileService.deletePermanently(userId, req.params.id as string);
    sendSuccess(res, { message: 'File permanently deleted' });
  } catch (err) {
    next(err);
  }
});
