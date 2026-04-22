import { Router, Request, Response } from 'express';
import { SessionsService } from './sessions.service';
import { requireAuth } from '../../../middleware/auth.middleware';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try { res.json(await SessionsService.listSessions(req.identity!.uuid)); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete('/:uuid', requireAuth, async (req: Request, res: Response) => {
  try {
    await SessionsService.revokeSession(req.params['uuid'], req.identity!.uuid, req.ip);
    res.status(204).end();
  } catch (err: any) { res.status(err.status ?? 500).json({ error: err.message }); }
});

router.delete('/', requireAuth, async (req: Request, res: Response) => {
  try {
    await SessionsService.revokeAllSessions(req.identity!.uuid, undefined, req.ip);
    res.status(204).end();
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
