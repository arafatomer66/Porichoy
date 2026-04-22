import { Router, Request, Response } from 'express';
import { ApplicationsService } from './applications.service';
import { requireAuth } from '../../../middleware/auth.middleware';
import { requireAdmin } from '../../../middleware/admin.middleware';

const router = Router();

router.get('/', requireAuth, requireAdmin, async (_req, res: Response) => {
  try { res.json(await ApplicationsService.list()); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/:uuid', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const app = await ApplicationsService.get(req.params['uuid']);
    if (!app) return res.status(404).json({ error: 'not_found' });
    res.json(app);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try { res.status(201).json(await ApplicationsService.create(req.body, req.identity!.uuid, req.ip)); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.patch('/:uuid', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try { res.json(await ApplicationsService.update(req.params['uuid'], req.body, req.identity!.uuid, req.ip)); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete('/:uuid', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try { await ApplicationsService.delete(req.params['uuid'], req.identity!.uuid, req.ip); res.status(204).end(); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
