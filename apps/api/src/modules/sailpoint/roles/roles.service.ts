import { AppDataSource } from '../../../config/database';
import { Role } from '../../../entities/role.entity';
import { Entitlement } from '../../../entities/entitlement.entity';
import { RoleEntitlement } from '../../../entities/role-entitlement.entity';
import { writeAudit } from '../../../middleware/audit.middleware';

export const RolesService = {
  async listRoles(applicationUuid?: string) {
    const where = applicationUuid ? { applicationUuid } : {};
    return AppDataSource.getRepository(Role).find({ where, order: { name: 'ASC' }, relations: ['application'] });
  },

  async getRole(uuid: string) {
    return AppDataSource.getRepository(Role).findOne({ where: { uuid }, relations: ['application'] });
  },

  async createRole(dto: Partial<Role>, actorUuid?: string, ipAddress?: string) {
    const repo = AppDataSource.getRepository(Role);
    const role = await repo.save(repo.create(dto));
    await writeAudit({ actorUuid, action: 'role.create', resourceType: 'role', resourceUuid: role.uuid, ipAddress });
    return role;
  },

  async updateRole(uuid: string, dto: Partial<Role>, actorUuid?: string, ipAddress?: string) {
    await AppDataSource.getRepository(Role).update(uuid, dto);
    await writeAudit({ actorUuid, action: 'role.update', resourceType: 'role', resourceUuid: uuid, ipAddress });
    return AppDataSource.getRepository(Role).findOneBy({ uuid });
  },

  async deleteRole(uuid: string, actorUuid?: string, ipAddress?: string) {
    await AppDataSource.getRepository(Role).delete(uuid);
    await writeAudit({ actorUuid, action: 'role.delete', resourceType: 'role', resourceUuid: uuid, ipAddress });
  },

  async listEntitlements(applicationUuid: string) {
    return AppDataSource.getRepository(Entitlement).find({ where: { applicationUuid } });
  },

  async createEntitlement(dto: Partial<Entitlement>, actorUuid?: string) {
    const repo = AppDataSource.getRepository(Entitlement);
    const ent = await repo.save(repo.create(dto));
    await writeAudit({ actorUuid, action: 'entitlement.create', resourceType: 'entitlement', resourceUuid: ent.uuid });
    return ent;
  },

  async deleteEntitlement(uuid: string, actorUuid?: string) {
    await AppDataSource.getRepository(Entitlement).delete(uuid);
    await writeAudit({ actorUuid, action: 'entitlement.delete', resourceType: 'entitlement', resourceUuid: uuid });
  },

  async addEntitlementToRole(roleUuid: string, entitlementUuid: string, actorUuid?: string) {
    const repo = AppDataSource.getRepository(RoleEntitlement);
    const binding = repo.create({ roleUuid, entitlementUuid });
    await repo.save(binding);
    await writeAudit({ actorUuid, action: 'role.entitlement_add', resourceType: 'role', resourceUuid: roleUuid, details: { entitlementUuid } });
    return binding;
  },

  async removeEntitlementFromRole(roleUuid: string, entitlementUuid: string, actorUuid?: string) {
    await AppDataSource.getRepository(RoleEntitlement).delete({ roleUuid, entitlementUuid });
    await writeAudit({ actorUuid, action: 'role.entitlement_remove', resourceType: 'role', resourceUuid: roleUuid, details: { entitlementUuid } });
  },

  async getRoleEntitlements(roleUuid: string) {
    const bindings = await AppDataSource.getRepository(RoleEntitlement)
      .find({ where: { roleUuid }, relations: ['entitlement'] });
    return bindings.map((b) => b.entitlement);
  },
};
