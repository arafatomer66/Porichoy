import { AppDataSource } from '../../../config/database';
import { Application } from '../../../entities/application.entity';
import { writeAudit } from '../../../middleware/audit.middleware';

export const ApplicationsService = {
  async list() {
    return AppDataSource.getRepository(Application).find({ order: { createdAt: 'DESC' } });
  },

  async get(uuid: string) {
    return AppDataSource.getRepository(Application).findOneBy({ uuid });
  },

  async create(dto: Partial<Application>, actorUuid?: string, ipAddress?: string) {
    const repo = AppDataSource.getRepository(Application);
    const app = await repo.save(repo.create(dto));
    await writeAudit({ actorUuid, action: 'application.create', resourceType: 'application', resourceUuid: app.uuid, ipAddress });
    return app;
  },

  async update(uuid: string, dto: Partial<Application>, actorUuid?: string, ipAddress?: string) {
    await AppDataSource.getRepository(Application).update(uuid, dto);
    await writeAudit({ actorUuid, action: 'application.update', resourceType: 'application', resourceUuid: uuid, details: dto as Record<string, unknown>, ipAddress });
    return AppDataSource.getRepository(Application).findOneBy({ uuid });
  },

  async delete(uuid: string, actorUuid?: string, ipAddress?: string) {
    await AppDataSource.getRepository(Application).delete(uuid);
    await writeAudit({ actorUuid, action: 'application.delete', resourceType: 'application', resourceUuid: uuid, ipAddress });
  },
};
