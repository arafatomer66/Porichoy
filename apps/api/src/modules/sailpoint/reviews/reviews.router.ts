import { Router, Request, Response } from 'express';
import { ReviewsService } from './reviews.service';
import { requireAuth } from '../../../middleware/auth.middleware';
import { requireAdmin } from '../../../middleware/admin.middleware';

const router = Router();

router.get('/', requireAuth, requireAdmin, async (_req, res: Response) => {
  try { res.json(await ReviewsService.list()); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/:uuid', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const r = await ReviewsService.get(req.params['uuid']);
    if (!r) return res.status(404).json({ error: 'not_found' });
    res.json(r);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try { res.status(201).json(await ReviewsService.create(req.body, req.identity!.uuid)); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/:uuid/items', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try { res.json(await ReviewsService.getItems(req.params['uuid'])); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.patch('/items/:itemUuid/decide', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { decision, comments } = req.body;
    res.json(await ReviewsService.decide(req.params['itemUuid'], decision, comments, req.identity!.uuid));
  } catch (err: any) { res.status(err.status ?? 500).json({ error: err.message }); }
});

router.post('/:uuid/complete', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try { res.json(await ReviewsService.complete(req.params['uuid'], req.identity!.uuid)); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/:uuid/cancel', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try { await ReviewsService.cancel(req.params['uuid'], req.identity!.uuid); res.status(204).end(); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
