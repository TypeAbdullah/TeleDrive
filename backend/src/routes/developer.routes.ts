import { Router, Request, Response, NextFunction } from 'express';
import { developerService } from '../services/developer.service.js';
import { sendSuccess } from '../shared/response.js';

export const developerRouter = Router();

developerRouter.get('/keys', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.authUser!.id;
    const keys = await developerService.listApiKeys(userId);
    sendSuccess(res, keys);
  } catch (err) {
    next(err);
  }
});

developerRouter.post('/keys', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.authUser!.id;
    const { name, scopes } = req.body;
    const result = await developerService.createApiKey(userId, name, scopes);
    sendSuccess(res, result, 201);
  } catch (err) {
    next(err);
  }
});

developerRouter.delete('/keys/:keyId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.authUser!.id;
    await developerService.revokeApiKey(userId, req.params.keyId as string);
    sendSuccess(res, { message: 'API key revoked' });
  } catch (err) {
    next(err);
  }
});
