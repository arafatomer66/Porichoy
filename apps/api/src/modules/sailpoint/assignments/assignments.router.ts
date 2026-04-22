import { Router, Request, Response } from 'express';
import { AssignmentsService } from './assignments.service';
import { requireAuth } from '../../../middleware/auth.middleware';
import { requireAdmin } from '../../../middleware/admin.middleware';

const router = Router();

router.get('/identities/:identityUuid', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try { res.json(await AssignmentsService.listForIdentity(req.params['identityUuid'])); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try { res.status(201).json(await AssignmentsService.grant(req.body, req.identity!.uuid, req.ip)); }
  catch (err: any) { res.status(err.status ?? 500).json({ error: err.message }); }
});

router.delete('/:uuid', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try { await AssignmentsService.revoke(req.params['uuid'], req.identity!.uuid, req.ip); res.status(204).end(); }
  catch (err: any) { res.status(err.status ?? 500).json({ error: err.message }); }
});

router.post('/check-sod', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { identityUuid, roleUuid } = req.body;
    res.json(await AssignmentsService.checkSod(identityUuid, roleUuid));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/sod-policies', requireAuth, requireAdmin, async (_req, res: Response) => {
  try { res.json(await AssignmentsService.listSodPolicies()); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/sod-policies', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try { res.status(201).json(await AssignmentsService.createSodPolicy(req.body, req.identity!.uuid)); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.patch('/sod-policies/:uuid', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try { res.json(await AssignmentsService.updateSodPolicy(req.params['uuid'], req.body, req.identity!.uuid)); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete('/sod-policies/:uuid', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try { await AssignmentsService.deleteSodPolicy(req.params['uuid'], req.identity!.uuid); res.status(204).end(); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
