import { Router, Request, Response } from 'express';
import { LifecycleService } from './lifecycle.service';
import { requireAuth } from '../../../middleware/auth.middleware';
import { requireAdmin } from '../../../middleware/admin.middleware';

const router = Router();

router.get('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try { res.json(await LifecycleService.list(req.query['identityUuid'] as string | undefined)); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/:uuid', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const event = await LifecycleService.get(req.params['uuid']);
    if (!event) return res.status(404).json({ error: 'not_found' });
    res.json(event);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try { res.status(201).json(await LifecycleService.trigger(req.body, req.identity!.uuid)); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
