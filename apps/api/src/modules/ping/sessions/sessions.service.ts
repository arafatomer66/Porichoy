import { AppDataSource } from '../../../config/database';
import { Session } from '../../../entities/session.entity';
import { AccessToken } from '../../../entities/access-token.entity';
import { RefreshToken } from '../../../entities/refresh-token.entity';
import { writeAudit } from '../../../middleware/audit.middleware';

export const SessionsService = {
  async listSessions(identityUuid: string) {
    return AppDataSource.getRepository(Session).find({
      where: { identityUuid, isActive: true },
      order: { lastActiveAt: 'DESC' },
    });
  },

  async revokeSession(sessionUuid: string, actorUuid: string, ipAddress?: string) {
    const session = await AppDataSource.getRepository(Session).findOneBy({ uuid: sessionUuid });
    if (!session) throw Object.assign(new Error('session_not_found'), { status: 404 });
    if (session.identityUuid !== actorUuid) throw Object.assign(new Error('forbidden'), { status: 403 });

    await AppDataSource.getRepository(Session).update(sessionUuid, { isActive: false });
    await writeAudit({ actorUuid, action: 'session.revoke', resourceType: 'session', resourceUuid: sessionUuid, ipAddress });
  },

  async revokeAllSessions(identityUuid: string, exceptUuid?: string, ipAddress?: string) {
    const query = AppDataSource.getRepository(Session)
      .createQueryBuilder()
      .update()
      .set({ isActive: false })
      .where('identity_uuid = :identityUuid', { identityUuid })
      .andWhere('is_active = true');

    if (exceptUuid) query.andWhere('uuid != :exceptUuid', { exceptUuid });
    await query.execute();
    await writeAudit({ actorUuid: identityUuid, action: 'session.revoke_all', resourceType: 'identity', resourceUuid: identityUuid, ipAddress });
  },

  async revokeToken(jti: string, actorUuid: string) {
    await AppDataSource.getRepository(AccessToken).update({ jti }, { revoked: true });
    await writeAudit({ actorUuid, action: 'token.revoke', resourceType: 'access_token', resourceUuid: jti });
  },
};
