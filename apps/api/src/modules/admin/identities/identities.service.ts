import { AppDataSource } from '../../../config/database';
import { Identity } from '../../../entities/identity.entity';
import { IdentityStatus } from '@porichoy/shared-types';
import { writeAudit } from '../../../middleware/audit.middleware';

export const IdentitiesService = {
  async list(filters: { status?: IdentityStatus; search?: string; limit?: number; offset?: number }) {
    const query = AppDataSource.getRepository(Identity).createQueryBuilder('i');
    if (filters.status) query.andWhere('i.status = :status', { status: filters.status });
    if (filters.search) query.andWhere('i.display_name ILIKE :search OR i.email ILIKE :search', { search: `%${filters.search}%` });
    query.orderBy('i.created_at', 'DESC');
    query.limit(filters.limit ?? 50);
    query.offset(filters.offset ?? 0);
    const [items, total] = await query.getManyAndCount();
    return { items, total };
  },

  async get(uuid: string) {
    return AppDataSource.getRepository(Identity).findOneBy({ uuid });
  },

  async update(uuid: string, dto: Partial<Identity>, actorUuid?: string, ipAddress?: string) {
    await AppDataSource.getRepository(Identity).update(uuid, dto);
    await writeAudit({ actorUuid, action: 'identity.update', resourceType: 'identity', resourceUuid: uuid, ipAddress });
    return AppDataSource.getRepository(Identity).findOneBy({ uuid });
  },

  async lock(uuid: string, actorUuid?: string, ipAddress?: string) {
    await AppDataSource.getRepository(Identity).update(uuid, { status: IdentityStatus.Locked });
    await writeAudit({ actorUuid, action: 'identity.lock', resourceType: 'identity', resourceUuid: uuid, ipAddress });
  },

  async unlock(uuid: string, actorUuid?: string, ipAddress?: string) {
    await AppDataSource.getRepository(Identity).update(uuid, { status: IdentityStatus.Active });
    await writeAudit({ actorUuid, action: 'identity.unlock', resourceType: 'identity', resourceUuid: uuid, ipAddress });
  },
};
