import { Request, Response, NextFunction } from 'express';
import { jwtVerify } from 'jose';
import { getPublicKey } from '../config/keys';
import { env } from '../config/env';
import { AppDataSource } from '../config/database';
import { AccessToken } from '../entities/access-token.entity';
import { Session } from '../entities/session.entity';
import * as bcrypt from 'bcrypt';

declare global {
  namespace Express {
    interface Request {
      identity?: { uuid: string; isAdmin: boolean };
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const sessionCookie = req.cookies?.[env.session.cookieName];

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const { payload } = await jwtVerify(token, getPublicKey(), { issuer: env.jwt.issuer });
      const jti = payload['jti'] as string;

      const at = await AppDataSource.getRepository(AccessToken).findOneBy({ jti, revoked: false });
      if (!at || at.expiresAt < new Date()) {
        res.status(401).json({ error: 'token_expired' });
        return;
      }
      req.identity = { uuid: payload['sub'] as string, isAdmin: (payload['is_admin'] as boolean) ?? false };
      next();
      return;
    }

    if (sessionCookie) {
      const sessions = await AppDataSource.getRepository(Session)
        .createQueryBuilder('s')
        .innerJoinAndSelect('s.identity', 'i')
        .where('s.is_active = true AND s.expires_at > NOW()')
        .getMany();

      for (const session of sessions) {
        if (await bcrypt.compare(sessionCookie, session.sessionTokenHash)) {
          req.identity = { uuid: session.identityUuid, isAdmin: session.identity.isAdmin };
          await AppDataSource.getRepository(Session).update(session.uuid, { lastActiveAt: new Date() });
          next();
          return;
        }
      }
    }

    res.status(401).json({ error: 'unauthorized' });
  } catch {
    res.status(401).json({ error: 'unauthorized' });
  }
}
