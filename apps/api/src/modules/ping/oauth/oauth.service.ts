import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { SignJWT } from 'jose';
import { IsNull } from 'typeorm';
import { AppDataSource } from '../../../config/database';
import { env } from '../../../config/env';
import { getPrivateKey } from '../../../config/keys';
import { OAuthClient } from '../../../entities/oauth-client.entity';
import { AuthorizationCode } from '../../../entities/authorization-code.entity';
import { AccessToken } from '../../../entities/access-token.entity';
import { RefreshToken } from '../../../entities/refresh-token.entity';
import { Consent } from '../../../entities/consent.entity';
import { Identity } from '../../../entities/identity.entity';
import { IdentityRole } from '../../../entities/identity-role.entity';
import { RoleEntitlement } from '../../../entities/role-entitlement.entity';
import { IdentityRoleStatus } from '@porichoy/shared-types';
import { writeAudit } from '../../../middleware/audit.middleware';

export const OAuthService = {
  async getClient(clientId: string): Promise<OAuthClient | null> {
    return AppDataSource.getRepository(OAuthClient).findOne({
      where: { clientId, isActive: true },
      relations: ['application'],
    });
  },

  async authorize(params: {
    clientId: string;
    redirectUri: string;
    scope: string;
    responseType: string;
    codeChallenge?: string;
    codeChallengeMethod?: string;
    identityUuid: string;
    consentGiven: boolean;
    state?: string;
  }) {
    const client = await OAuthService.getClient(params.clientId);
    if (!client) throw Object.assign(new Error('invalid_client'), { status: 400 });
    if (!client.redirectUris.includes(params.redirectUri)) throw Object.assign(new Error('invalid_redirect_uri'), { status: 400 });
    if (params.responseType !== 'code') throw Object.assign(new Error('unsupported_response_type'), { status: 400 });

    if (!params.consentGiven) {
      const existing = await AppDataSource.getRepository(Consent).findOneBy({
        clientUuid: client.uuid,
        identityUuid: params.identityUuid,
        revokedAt: IsNull(),
      });
      if (!existing) return { requiresConsent: true, client };
    }

    const code = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await AppDataSource.getRepository(AuthorizationCode).save(
      AppDataSource.getRepository(AuthorizationCode).create({
        code,
        clientUuid: client.uuid,
        identityUuid: params.identityUuid,
        redirectUri: params.redirectUri,
        scope: params.scope,
        codeChallenge: params.codeChallenge ?? null,
        codeChallengeMethod: params.codeChallengeMethod ?? 'S256',
        expiresAt,
      })
    );

    if (params.consentGiven) {
      const consentRepo = AppDataSource.getRepository(Consent);
      const existing = await consentRepo.findOneBy({ clientUuid: client.uuid, identityUuid: params.identityUuid, revokedAt: IsNull() });
      if (!existing) {
        await consentRepo.save(consentRepo.create({
          identityUuid: params.identityUuid,
          clientUuid: client.uuid,
          scopesGranted: params.scope.split(' '),
        }));
      }
    }

    const redirectUrl = new URL(params.redirectUri);
    redirectUrl.searchParams.set('code', code);
    if (params.state) redirectUrl.searchParams.set('state', params.state);

    return { requiresConsent: false, redirectUrl: redirectUrl.toString() };
  },

  async token(params: {
    grantType: string;
    code?: string;
    redirectUri?: string;
    codeVerifier?: string;
    refreshToken?: string;
    clientId: string;
    clientSecret?: string;
  }) {
    const client = await OAuthService.getClient(params.clientId);
    if (!client) throw Object.assign(new Error('invalid_client'), { status: 401 });

    if (client.clientType === 'confidential') {
      if (!params.clientSecret) throw Object.assign(new Error('client_secret_required'), { status: 401 });
      const valid = await bcrypt.compare(params.clientSecret, client.clientSecretHash!);
      if (!valid) throw Object.assign(new Error('invalid_client'), { status: 401 });
    }

    if (params.grantType === 'authorization_code') {
      return OAuthService.exchangeCode(client, params.code!, params.redirectUri!, params.codeVerifier);
    }
    if (params.grantType === 'refresh_token') {
      return OAuthService.refreshTokenGrant(client, params.refreshToken!);
    }
    throw Object.assign(new Error('unsupported_grant_type'), { status: 400 });
  },

  async exchangeCode(client: OAuthClient, code: string, redirectUri: string, codeVerifier?: string) {
    const codeRepo = AppDataSource.getRepository(AuthorizationCode);
    const ac = await codeRepo.findOneBy({ code, clientUuid: client.uuid, used: false });
    if (!ac) throw Object.assign(new Error('invalid_grant'), { status: 400 });
    if (ac.expiresAt < new Date()) throw Object.assign(new Error('invalid_grant'), { status: 400 });
    if (ac.redirectUri !== redirectUri) throw Object.assign(new Error('redirect_uri_mismatch'), { status: 400 });

    if (ac.codeChallenge) {
      if (!codeVerifier) throw Object.assign(new Error('code_verifier_required'), { status: 400 });
      const digest = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
      if (digest !== ac.codeChallenge) throw Object.assign(new Error('invalid_code_verifier'), { status: 400 });
    }

    await codeRepo.update(ac.uuid, { used: true });

    const identity = await AppDataSource.getRepository(Identity).findOneBy({ uuid: ac.identityUuid });
    if (!identity) throw Object.assign(new Error('identity_not_found'), { status: 400 });

    const entitlements = await OAuthService.getEntitlements(identity.uuid, client.applicationUuid);
    return OAuthService.issueTokens(client, identity, ac.scope, entitlements);
  },

  async refreshTokenGrant(client: OAuthClient, tokenValue: string) {
    const rtRepo = AppDataSource.getRepository(RefreshToken);
    const rts = await rtRepo.find({ where: { clientUuid: client.uuid, revoked: false }, relations: ['identity'] });

    let matched: RefreshToken | null = null;
    for (const rt of rts) {
      if (await bcrypt.compare(tokenValue, rt.tokenHash)) { matched = rt; break; }
    }
    if (!matched || matched.expiresAt < new Date()) throw Object.assign(new Error('invalid_grant'), { status: 400 });

    await rtRepo.update(matched.uuid, { revoked: true });

    const entitlements = await OAuthService.getEntitlements(matched.identityUuid, client.applicationUuid);
    return OAuthService.issueTokens(client, matched.identity, matched.scope, entitlements, matched.uuid);
  },

  async getEntitlements(identityUuid: string, applicationUuid: string | null): Promise<string[]> {
    const query = AppDataSource.getRepository(IdentityRole)
      .createQueryBuilder('ir')
      .innerJoin('ir.role', 'r')
      .innerJoin('role_entitlements', 're', 're.role_uuid = r.uuid')
      .innerJoin('entitlements', 'e', 'e.uuid = re.entitlement_uuid')
      .where('ir.identity_uuid = :identityUuid', { identityUuid })
      .andWhere('ir.status = :status', { status: IdentityRoleStatus.Active });

    if (applicationUuid) query.andWhere('r.application_uuid = :applicationUuid', { applicationUuid });

    const rows = await query.select('e.entitlement_key', 'key').getRawMany<{ key: string }>();
    return rows.map((r) => r.key);
  },

  async issueTokens(client: OAuthClient, identity: Identity, scope: string, entitlements: string[], parentRefreshUuid?: string) {
    const jti = uuidv4();
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = env.jwt.accessTokenTtlSeconds;

    const claims: Record<string, unknown> = {
      sub: identity.uuid,
      iss: env.jwt.issuer,
      aud: client.clientId,
      iat: now,
      exp: now + expiresIn,
      jti,
      scope,
      is_admin: identity.isAdmin,
      email: identity.email,
      name: identity.displayName,
      entitlements,
    };

    const accessToken = await new SignJWT(claims)
      .setProtectedHeader({ alg: 'RS256', kid: 'porichoy-1' })
      .sign(getPrivateKey());

    const atRepo = AppDataSource.getRepository(AccessToken);
    await atRepo.save(atRepo.create({
      jti, clientUuid: client.uuid, identityUuid: identity.uuid, scope,
      expiresAt: new Date((now + expiresIn) * 1000),
    }));

    const rawRefresh = uuidv4() + uuidv4();
    const refreshHash = await bcrypt.hash(rawRefresh, 10);
    const rtRepo = AppDataSource.getRepository(RefreshToken);
    await rtRepo.save(rtRepo.create({
      tokenHash: refreshHash, clientUuid: client.uuid, identityUuid: identity.uuid, scope,
      expiresAt: new Date(Date.now() + env.jwt.refreshTokenTtlDays * 86400 * 1000),
      parentUuid: parentRefreshUuid ?? null,
    }));

    await writeAudit({ actorUuid: identity.uuid, action: 'oauth.token_issued', resourceType: 'access_token', resourceUuid: jti });

    return { access_token: accessToken, refresh_token: rawRefresh, token_type: 'Bearer', expires_in: expiresIn, scope };
  },

  async userinfo(identityUuid: string) {
    const identity = await AppDataSource.getRepository(Identity).findOneBy({ uuid: identityUuid });
    if (!identity) throw Object.assign(new Error('not_found'), { status: 404 });
    return {
      sub: identity.uuid,
      name: identity.displayName,
      email: identity.email,
      phone: identity.phone,
      email_verified: identity.emailVerified,
      phone_number_verified: identity.phoneVerified,
    };
  },
};
