import { Router, Request, Response } from 'express';
import { AuditService } from './audit.service';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';

const router = Router();

router.get('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { actorUuid, action, resourceType, resourceUuid, from, to, limit, offset } = req.query as Record<string, string>;
    res.json(await AuditService.query({
      actorUuid, action, resourceType, resourceUuid, from, to,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    }));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
