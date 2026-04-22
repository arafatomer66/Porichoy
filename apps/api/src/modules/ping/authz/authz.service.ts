import { AppDataSource } from '../../../config/database';
import { AuthPolicy } from '../../../entities/auth-policy.entity';
import { PolicyRoleBinding } from '../../../entities/policy-role-binding.entity';
import { IdentityRole } from '../../../entities/identity-role.entity';
import { PolicyEffect, IdentityRoleStatus } from '@porichoy/shared-types';
import { IAuthzEvaluateRequest, IAuthzEvaluateResponse } from '@porichoy/shared-types';
import { writeAudit } from '../../../middleware/audit.middleware';

export const AuthzService = {
  async evaluate(req: IAuthzEvaluateRequest, actorUuid?: string, ipAddress?: string): Promise<IAuthzEvaluateResponse> {
    const policies = await AppDataSource.getRepository(AuthPolicy)
      .createQueryBuilder('p')
      .where('p.resource = :resource', { resource: req.resource })
      .andWhere('p.action = :action', { action: req.action })
      .andWhere('p.is_active = true')
      .orderBy('p.priority', 'DESC')
      .getMany();

    if (!policies.length) {
      return { allowed: false, reasons: ['no_matching_policy'] };
    }

    const identityRoles = await AppDataSource.getRepository(IdentityRole)
      .find({ where: { identityUuid: req.identityUuid, status: IdentityRoleStatus.Active } });

    const identityRoleUuids = new Set(identityRoles.map((ir) => ir.roleUuid));
    const reasons: string[] = [];

    for (const policy of policies) {
      const bindings = await AppDataSource.getRepository(PolicyRoleBinding)
        .find({ where: { policyUuid: policy.uuid } });

      const requiredRoles = bindings.map((b) => b.roleUuid);
      const hasRole = requiredRoles.some((r) => identityRoleUuids.has(r));

      if (policy.effect === PolicyEffect.Deny && hasRole) {
        reasons.push(`denied_by_policy:${policy.name}`);
        await writeAudit({ actorUuid, action: 'authz.evaluate', resourceType: 'policy', resourceUuid: policy.uuid, details: { allowed: false, resource: req.resource, action: req.action }, ipAddress });
        return { allowed: false, reasons };
      }

      if (policy.effect === PolicyEffect.Allow && hasRole) {
        await writeAudit({ actorUuid, action: 'authz.evaluate', resourceType: 'policy', resourceUuid: policy.uuid, details: { allowed: true, resource: req.resource, action: req.action }, ipAddress });
        return { allowed: true, reasons: [] };
      }

      if (policy.effect === PolicyEffect.Allow && !hasRole) {
        reasons.push(`missing_role_for_policy:${policy.name}`);
      }
    }

    return { allowed: false, reasons };
  },

  async listPolicies() {
    return AppDataSource.getRepository(AuthPolicy).find({ order: { priority: 'DESC' } });
  },

  async createPolicy(dto: Partial<AuthPolicy>) {
    const repo = AppDataSource.getRepository(AuthPolicy);
    const policy = repo.create(dto);
    return repo.save(policy);
  },

  async updatePolicy(uuid: string, dto: Partial<AuthPolicy>) {
    await AppDataSource.getRepository(AuthPolicy).update(uuid, dto);
    return AppDataSource.getRepository(AuthPolicy).findOneBy({ uuid });
  },

  async deletePolicy(uuid: string) {
    await AppDataSource.getRepository(AuthPolicy).delete(uuid);
  },

  async bindRole(policyUuid: string, roleUuid: string) {
    const repo = AppDataSource.getRepository(PolicyRoleBinding);
    const binding = repo.create({ policyUuid, roleUuid });
    return repo.save(binding);
  },

  async unbindRole(policyUuid: string, roleUuid: string) {
    await AppDataSource.getRepository(PolicyRoleBinding).delete({ policyUuid, roleUuid });
  },
};
