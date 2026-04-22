import { Router, Request, Response } from 'express';
import { RolesService } from './roles.service';
import { requireAuth } from '../../../middleware/auth.middleware';
import { requireAdmin } from '../../../middleware/admin.middleware';

const router = Router();

router.get('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try { res.json(await RolesService.listRoles(req.query['applicationUuid'] as string | undefined)); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/:uuid', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const role = await RolesService.getRole(req.params['uuid']);
    if (!role) return res.status(404).json({ error: 'not_found' });
    res.json(role);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try { res.status(201).json(await RolesService.createRole(req.body, req.identity!.uuid, req.ip)); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.patch('/:uuid', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try { res.json(await RolesService.updateRole(req.params['uuid'], req.body, req.identity!.uuid, req.ip)); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete('/:uuid', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try { await RolesService.deleteRole(req.params['uuid'], req.identity!.uuid, req.ip); res.status(204).end(); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/:uuid/entitlements', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try { res.json(await RolesService.getRoleEntitlements(req.params['uuid'])); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/:uuid/entitlements/:entitlementUuid', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try { res.status(201).json(await RolesService.addEntitlementToRole(req.params['uuid'], req.params['entitlementUuid'], req.identity!.uuid)); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete('/:uuid/entitlements/:entitlementUuid', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try { await RolesService.removeEntitlementFromRole(req.params['uuid'], req.params['entitlementUuid'], req.identity!.uuid); res.status(204).end(); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/entitlements', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try { res.json(await RolesService.listEntitlements(req.query['applicationUuid'] as string)); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/entitlements', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try { res.status(201).json(await RolesService.createEntitlement(req.body, req.identity!.uuid)); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete('/entitlements/:uuid', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try { await RolesService.deleteEntitlement(req.params['uuid'], req.identity!.uuid); res.status(204).end(); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
