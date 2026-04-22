import { AppDataSource } from '../../../config/database';
import { IdentityRole } from '../../../entities/identity-role.entity';
import { SodPolicy } from '../../../entities/sod-policy.entity';
import { IdentityRoleStatus, SodEnforcement } from '@porichoy/shared-types';
import { writeAudit } from '../../../middleware/audit.middleware';

export const AssignmentsService = {
  async listForIdentity(identityUuid: string) {
    return AppDataSource.getRepository(IdentityRole).find({
      where: { identityUuid },
      relations: ['role', 'role.application'],
      order: { createdAt: 'DESC' },
    });
  },

  async grant(dto: {
    identityUuid: string;
    roleUuid: string;
    context?: Record<string, unknown>;
    grantedReason?: string;
    expiresAt?: Date | null;
  }, actorUuid?: string, ipAddress?: string) {
    const sodResult = await AssignmentsService.checkSod(dto.identityUuid, dto.roleUuid);
    if (sodResult.violation && sodResult.enforcement === SodEnforcement.Prevent) {
      throw Object.assign(new Error(`sod_violation:${sodResult.policyName}`), { status: 409 });
    }

    const repo = AppDataSource.getRepository(IdentityRole);
    const assignment = await repo.save(repo.create({
      identityUuid: dto.identityUuid,
      roleUuid: dto.roleUuid,
      context: dto.context ?? {},
      grantedBy: actorUuid ?? null,
      grantedReason: dto.grantedReason ?? '',
      expiresAt: dto.expiresAt ?? null,
      status: IdentityRoleStatus.Active,
    }));

    await writeAudit({ actorUuid, action: 'role.grant', resourceType: 'identity_role', resourceUuid: assignment.uuid, details: { identityUuid: dto.identityUuid, roleUuid: dto.roleUuid }, ipAddress });
    return { assignment, sodWarning: sodResult.violation ? sodResult.policyName : null };
  },

  async revoke(assignmentUuid: string, actorUuid?: string, ipAddress?: string) {
    const repo = AppDataSource.getRepository(IdentityRole);
    const assignment = await repo.findOneBy({ uuid: assignmentUuid });
    if (!assignment) throw Object.assign(new Error('assignment_not_found'), { status: 404 });

    await repo.update(assignmentUuid, { status: IdentityRoleStatus.Revoked });
    await writeAudit({ actorUuid, action: 'role.revoke', resourceType: 'identity_role', resourceUuid: assignmentUuid, details: { identityUuid: assignment.identityUuid, roleUuid: assignment.roleUuid }, ipAddress });
  },

  async checkSod(identityUuid: string, newRoleUuid: string) {
    const currentRoles = await AppDataSource.getRepository(IdentityRole)
      .find({ where: { identityUuid, status: IdentityRoleStatus.Active } });
    const currentRoleUuids = currentRoles.map((ir) => ir.roleUuid);

    const sodPolicies = await AppDataSource.getRepository(SodPolicy)
      .find({ where: { isActive: true } });

    for (const sod of sodPolicies) {
      const aConflicts = sod.conflictingRoleA === newRoleUuid && currentRoleUuids.includes(sod.conflictingRoleB);
      const bConflicts = sod.conflictingRoleB === newRoleUuid && currentRoleUuids.includes(sod.conflictingRoleA);
      if (aConflicts || bConflicts) {
        return { violation: true, policyName: sod.name, enforcement: sod.enforcement };
      }
    }
    return { violation: false, policyName: null, enforcement: null };
  },

  async listSodPolicies() {
    return AppDataSource.getRepository(SodPolicy).find({ order: { createdAt: 'DESC' } });
  },

  async createSodPolicy(dto: Partial<SodPolicy>, actorUuid?: string) {
    const repo = AppDataSource.getRepository(SodPolicy);
    const policy = await repo.save(repo.create(dto));
    await writeAudit({ actorUuid, action: 'sod_policy.create', resourceType: 'sod_policy', resourceUuid: policy.uuid });
    return policy;
  },

  async updateSodPolicy(uuid: string, dto: Partial<SodPolicy>, actorUuid?: string) {
    await AppDataSource.getRepository(SodPolicy).update(uuid, dto);
    return AppDataSource.getRepository(SodPolicy).findOneBy({ uuid });
  },

  async deleteSodPolicy(uuid: string, actorUuid?: string) {
    await AppDataSource.getRepository(SodPolicy).delete(uuid);
    await writeAudit({ actorUuid, action: 'sod_policy.delete', resourceType: 'sod_policy', resourceUuid: uuid });
  },
};
