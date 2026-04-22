import { AppDataSource } from '../../../config/database';
import { LifecycleEvent } from '../../../entities/lifecycle-event.entity';
import { Identity } from '../../../entities/identity.entity';
import { IdentityRole } from '../../../entities/identity-role.entity';
import { LifecycleEventType, LifecycleEventStatus, IdentityStatus, IdentityRoleStatus } from '@porichoy/shared-types';
import { writeAudit } from '../../../middleware/audit.middleware';

export const LifecycleService = {
  async list(identityUuid?: string) {
    const where = identityUuid ? { identityUuid } : {};
    return AppDataSource.getRepository(LifecycleEvent).find({ where, order: { createdAt: 'DESC' } });
  },

  async trigger(dto: {
    identityUuid: string;
    eventType: LifecycleEventType;
    source?: string;
    payload?: Record<string, unknown>;
  }, actorUuid?: string) {
    const repo = AppDataSource.getRepository(LifecycleEvent);
    const event = await repo.save(repo.create({
      identityUuid: dto.identityUuid,
      eventType: dto.eventType,
      source: dto.source ?? 'manual',
      payload: dto.payload ?? {},
      status: LifecycleEventStatus.Pending,
    }));

    await writeAudit({ actorUuid, action: `lifecycle.${dto.eventType}`, resourceType: 'lifecycle_event', resourceUuid: event.uuid, details: dto.payload });
    await LifecycleService.processEvent(event);
    return repo.findOneBy({ uuid: event.uuid });
  },

  async processEvent(event: LifecycleEvent) {
    const repo = AppDataSource.getRepository(LifecycleEvent);
    try {
      await repo.update(event.uuid, { status: LifecycleEventStatus.Processing });

      if (event.eventType === LifecycleEventType.Joiner) {
        await AppDataSource.getRepository(Identity).update(event.identityUuid, { status: IdentityStatus.Active });
      }

      if (event.eventType === LifecycleEventType.Leaver) {
        await AppDataSource.getRepository(Identity).update(event.identityUuid, { status: IdentityStatus.Inactive });
        await AppDataSource.getRepository(IdentityRole)
          .createQueryBuilder()
          .update()
          .set({ status: IdentityRoleStatus.Revoked })
          .where('identity_uuid = :uuid AND status = :status', { uuid: event.identityUuid, status: IdentityRoleStatus.Active })
          .execute();
      }

      if (event.eventType === LifecycleEventType.Mover) {
        const payload = event.payload as { revokeRoleUuids?: string[]; grantRoleUuids?: string[] };
        if (payload.revokeRoleUuids?.length) {
          await AppDataSource.getRepository(IdentityRole)
            .createQueryBuilder()
            .update()
            .set({ status: IdentityRoleStatus.Revoked })
            .where('identity_uuid = :uuid AND role_uuid IN (:...roles)', { uuid: event.identityUuid, roles: payload.revokeRoleUuids })
            .execute();
        }
      }

      await repo.update(event.uuid, { status: LifecycleEventStatus.Completed, processedAt: new Date() });
    } catch (err) {
      await repo.update(event.uuid, { status: LifecycleEventStatus.Failed });
      throw err;
    }
  },

  async get(uuid: string) {
    return AppDataSource.getRepository(LifecycleEvent).findOneBy({ uuid });
  },
};
