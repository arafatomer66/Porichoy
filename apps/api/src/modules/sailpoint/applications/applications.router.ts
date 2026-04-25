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

// User sync — bulk import/correlate users for an application
router.post('/:uuid/sync-users', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { users } = req.body;
    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ error: 'users array is required and must not be empty' });
    }
    const result = await ApplicationsService.syncUsers(req.params['uuid'], users, req.identity!.uuid, req.ip);
    res.json(result);
  } catch (err: any) { res.status(err.status ?? 500).json({ error: err.message }); }
});

// Preview: test connection to app API, return fields and sample data
router.get('/:uuid/preview-users', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const preview = await ApplicationsService.previewAppUsers(req.params['uuid']);
    res.json(preview);
  } catch (err: any) { res.status(err.status ?? 500).json({ error: err.message }); }
});

// Sync users from connected app's API
router.post('/:uuid/sync-from-api', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const roleMapping = req.body.roleMapping ?? {};
    const result = await ApplicationsService.syncFromApi(req.params['uuid'], roleMapping, req.identity!.uuid, req.ip);
    res.json(result);
  } catch (err: any) { res.status(err.status ?? 500).json({ error: err.message }); }
});

// List roles for an application (used by sync UI to show role dropdown)
router.get('/:uuid/roles', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try { res.json(await ApplicationsService.listAppRoles(req.params['uuid'])); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
