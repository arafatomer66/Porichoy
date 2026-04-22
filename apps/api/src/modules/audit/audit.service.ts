import { AppDataSource } from '../../config/database';
import { AuditLog } from '../../entities/audit-log.entity';

export const AuditService = {
  async query(filters: {
    actorUuid?: string;
    action?: string;
    resourceType?: string;
    resourceUuid?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }) {
    const query = AppDataSource.getRepository(AuditLog).createQueryBuilder('a');

    if (filters.actorUuid) query.andWhere('a.actor_uuid = :actorUuid', { actorUuid: filters.actorUuid });
    if (filters.action) query.andWhere('a.action LIKE :action', { action: `%${filters.action}%` });
    if (filters.resourceType) query.andWhere('a.resource_type = :resourceType', { resourceType: filters.resourceType });
    if (filters.resourceUuid) query.andWhere('a.resource_uuid = :resourceUuid', { resourceUuid: filters.resourceUuid });
    if (filters.from) query.andWhere('a.timestamp >= :from', { from: filters.from });
    if (filters.to) query.andWhere('a.timestamp <= :to', { to: filters.to });

    query.orderBy('a.timestamp', 'DESC');
    query.limit(filters.limit ?? 50);
    query.offset(filters.offset ?? 0);

    const [items, total] = await query.getManyAndCount();
    return { items, total };
  },
};
