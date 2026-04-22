import { Router, Request, Response } from 'express';
import { ClientsService } from './clients.service';
import { requireAuth } from '../../../middleware/auth.middleware';
import { requireAdmin } from '../../../middleware/admin.middleware';

const router = Router();

router.get('/', requireAuth, requireAdmin, async (_req, res: Response) => {
  try { res.json(await ClientsService.list()); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/:uuid', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const client = await ClientsService.get(req.params['uuid']);
    if (!client) return res.status(404).json({ error: 'not_found' });
    res.json(client);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try { res.status(201).json(await ClientsService.create(req.body)); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.patch('/:uuid', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try { res.json(await ClientsService.update(req.params['uuid'], req.body)); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete('/:uuid', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try { await ClientsService.delete(req.params['uuid']); res.status(204).end(); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/:uuid/rotate-secret', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try { res.json(await ClientsService.rotateSecret(req.params['uuid'])); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
