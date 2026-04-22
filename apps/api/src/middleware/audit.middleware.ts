import { AppDataSource } from '../config/database';
import { AuditLog } from '../entities/audit-log.entity';

export async function writeAudit(opts: {
  actorUuid?: string | null;
  action: string;
  resourceType: string;
  resourceUuid?: string | null;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
}): Promise<void> {
  await AppDataSource.getRepository(AuditLog).insert({
    actorUuid: opts.actorUuid ?? null,
    action: opts.action,
    resourceType: opts.resourceType,
    resourceUuid: opts.resourceUuid ?? null,
    details: opts.details ?? {},
    ipAddress: opts.ipAddress ?? null,
  });
}
