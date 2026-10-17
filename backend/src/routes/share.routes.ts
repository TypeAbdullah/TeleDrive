import { Router, Request, Response, NextFunction } from 'express';
import { shareService } from '../services/share.service.js';
import { sendSuccess } from '../shared/response.js';

export const shareRouter = Router();

shareRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.authUser!.id;
    const { fileId, accessType, password, expiresInDays, maxDownloads } = req.body;

    const result = await shareService.createShareLink({
      userId,
      fileId,
      accessType,
      password,
      expiresInDays: expiresInDays ? Number(expiresInDays) : undefined,
      maxDownloads: maxDownloads ? Number(maxDownloads) : undefined,
    });

    sendSuccess(res, result, 201);
  } catch (err) {
    next(err);
  }
});

shareRouter.get('/file/:fileId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.authUser!.id;
    const shares = await shareService.getFileShares(userId, req.params.fileId as string);
    sendSuccess(res, shares);
  } catch (err) {
    next(err);
  }
});

shareRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.authUser!.id;
    await shareService.revokeShare(userId, req.params.id as string);
    sendSuccess(res, { message: 'Share link revoked' });
  } catch (err) {
    next(err);
  }
});
