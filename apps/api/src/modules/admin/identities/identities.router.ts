import { Router, Request, Response } from 'express';
import { IdentitiesService } from './identities.service';
import { requireAuth } from '../../../middleware/auth.middleware';
import { requireAdmin } from '../../../middleware/admin.middleware';

const router = Router();

router.get('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { status, search, limit, offset } = req.query as Record<string, string>;
    res.json(await IdentitiesService.list({
      status: status as any,
      search,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    }));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/:uuid', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const identity = await IdentitiesService.get(req.params['uuid']);
    if (!identity) return res.status(404).json({ error: 'not_found' });
    res.json(identity);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.patch('/:uuid', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try { res.json(await IdentitiesService.update(req.params['uuid'], req.body, req.identity!.uuid, req.ip)); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/:uuid/lock', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try { await IdentitiesService.lock(req.params['uuid'], req.identity!.uuid, req.ip); res.status(204).end(); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/:uuid/unlock', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try { await IdentitiesService.unlock(req.params['uuid'], req.identity!.uuid, req.ip); res.status(204).end(); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
