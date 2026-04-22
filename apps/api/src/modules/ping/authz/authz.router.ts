import { Router, Request, Response } from 'express';
import { AuthzService } from './authz.service';
import { requireAuth } from '../../../middleware/auth.middleware';
import { requireAdmin } from '../../../middleware/admin.middleware';

const router = Router();

router.post('/evaluate', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await AuthzService.evaluate(req.body, req.identity!.uuid, req.ip);
    res.json(result);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

router.get('/policies', requireAuth, requireAdmin, async (_req, res: Response) => {
  try { res.json(await AuthzService.listPolicies()); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/policies', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try { res.status(201).json(await AuthzService.createPolicy(req.body)); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.patch('/policies/:uuid', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try { res.json(await AuthzService.updatePolicy(req.params['uuid'], req.body)); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete('/policies/:uuid', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try { await AuthzService.deletePolicy(req.params['uuid']); res.status(204).end(); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/policies/:policyUuid/roles/:roleUuid', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try { res.status(201).json(await AuthzService.bindRole(req.params['policyUuid'], req.params['roleUuid'])); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete('/policies/:policyUuid/roles/:roleUuid', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try { await AuthzService.unbindRole(req.params['policyUuid'], req.params['roleUuid']); res.status(204).end(); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
