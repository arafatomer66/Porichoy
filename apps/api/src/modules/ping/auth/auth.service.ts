import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { AppDataSource } from '../../../config/database';
import { env } from '../../../config/env';
import { Identity } from '../../../entities/identity.entity';
import { Credential } from '../../../entities/credential.entity';
import { Session } from '../../../entities/session.entity';
import { IdentityStatus, IdentityType, CredentialType } from '@porichoy/shared-types';
import { writeAudit } from '../../../middleware/audit.middleware';

const BCRYPT_ROUNDS = 12;

export interface RegisterDto {
  displayName: string;
  email?: string;
  phone?: string;
  password?: string;
  identityType?: IdentityType;
}

export interface LoginDto {
  email?: string;
  phone?: string;
  password: string;
}

export interface OtpDto {
  email?: string;
  phone?: string;
}

export interface VerifyOtpDto {
  email?: string;
  phone?: string;
  otp: string;
}

export const AuthService = {
  async register(dto: RegisterDto, ipAddress?: string) {
    const identityRepo = AppDataSource.getRepository(Identity);
    const credRepo = AppDataSource.getRepository(Credential);

    if (!dto.email && !dto.phone) throw Object.assign(new Error('email or phone required'), { status: 400 });

    const existing = dto.email
      ? await identityRepo.findOneBy({ email: dto.email })
      : await identityRepo.findOneBy({ phone: dto.phone });
    if (existing) throw Object.assign(new Error('identity_exists'), { status: 409 });

    const identity = identityRepo.create({
      displayName: dto.displayName,
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      identityType: dto.identityType ?? IdentityType.Person,
      status: IdentityStatus.Active,
    });
    await identityRepo.save(identity);

    if (dto.password) {
      const hash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
      await credRepo.save(credRepo.create({
        identityUuid: identity.uuid,
        credentialType: CredentialType.Password,
        credentialHash: hash,
      }));
    }

    await writeAudit({ action: 'auth.register', resourceType: 'identity', resourceUuid: identity.uuid, ipAddress });
    return identity;
  },

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const identityRepo = AppDataSource.getRepository(Identity);
    const credRepo = AppDataSource.getRepository(Credential);

    const identity = dto.email
      ? await identityRepo.findOneBy({ email: dto.email })
      : await identityRepo.findOneBy({ phone: dto.phone });
    if (!identity) throw Object.assign(new Error('invalid_credentials'), { status: 401 });
    if (identity.status !== IdentityStatus.Active) throw Object.assign(new Error('account_inactive'), { status: 403 });

    const cred = await credRepo.findOneBy({ identityUuid: identity.uuid, credentialType: CredentialType.Password, isActive: true });
    if (!cred?.credentialHash) throw Object.assign(new Error('invalid_credentials'), { status: 401 });

    const valid = await bcrypt.compare(dto.password, cred.credentialHash);
    if (!valid) throw Object.assign(new Error('invalid_credentials'), { status: 401 });

    const session = await AuthService.createSession(identity.uuid, ipAddress, userAgent);
    await writeAudit({ actorUuid: identity.uuid, action: 'auth.login', resourceType: 'identity', resourceUuid: identity.uuid, ipAddress });
    return { identity, sessionToken: session.token, sessionUuid: session.uuid };
  },

  async requestOtp(dto: OtpDto, ipAddress?: string) {
    const identityRepo = AppDataSource.getRepository(Identity);
    const credRepo = AppDataSource.getRepository(Credential);

    const identity = dto.email
      ? await identityRepo.findOneBy({ email: dto.email })
      : await identityRepo.findOneBy({ phone: dto.phone });
    if (!identity) throw Object.assign(new Error('identity_not_found'), { status: 404 });

    const otp = env.otp.devMode ? env.otp.devValue : Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + env.otp.ttlMinutes * 60 * 1000;

    let cred = await credRepo.findOneBy({ identityUuid: identity.uuid, credentialType: CredentialType.Otp });
    if (cred) {
      cred.otpValue = otp;
      cred.otpExpiresAt = expiresAt;
      await credRepo.save(cred);
    } else {
      await credRepo.save(credRepo.create({ identityUuid: identity.uuid, credentialType: CredentialType.Otp, otpValue: otp, otpExpiresAt: expiresAt }));
    }

    await writeAudit({ actorUuid: identity.uuid, action: 'auth.otp_request', resourceType: 'identity', resourceUuid: identity.uuid, ipAddress });
    return { message: 'otp_sent', ...(env.otp.devMode ? { otp } : {}) };
  },

  async verifyOtp(dto: VerifyOtpDto, ipAddress?: string, userAgent?: string) {
    const identityRepo = AppDataSource.getRepository(Identity);
    const credRepo = AppDataSource.getRepository(Credential);

    const identity = dto.email
      ? await identityRepo.findOneBy({ email: dto.email })
      : await identityRepo.findOneBy({ phone: dto.phone });
    if (!identity) throw Object.assign(new Error('identity_not_found'), { status: 404 });

    const cred = await credRepo.findOneBy({ identityUuid: identity.uuid, credentialType: CredentialType.Otp, isActive: true });
    if (!cred?.otpValue || !cred.otpExpiresAt) throw Object.assign(new Error('no_otp_pending'), { status: 400 });
    if (Date.now() > cred.otpExpiresAt) throw Object.assign(new Error('otp_expired'), { status: 400 });
    if (cred.otpValue !== dto.otp) throw Object.assign(new Error('invalid_otp'), { status: 401 });

    cred.otpValue = null;
    cred.otpExpiresAt = null;
    await credRepo.save(cred);

    const session = await AuthService.createSession(identity.uuid, ipAddress, userAgent);
    await writeAudit({ actorUuid: identity.uuid, action: 'auth.otp_verify', resourceType: 'identity', resourceUuid: identity.uuid, ipAddress });
    return { identity, sessionToken: session.token, sessionUuid: session.uuid };
  },

  async createSession(identityUuid: string, ipAddress?: string, userAgent?: string) {
    const sessionRepo = AppDataSource.getRepository(Session);
    const token = uuidv4() + uuidv4();
    const tokenHash = await bcrypt.hash(token, BCRYPT_ROUNDS);
    const expiresAt = new Date(Date.now() + env.session.ttlDays * 86400 * 1000);

    const session = await sessionRepo.save(sessionRepo.create({
      identityUuid,
      sessionTokenHash: tokenHash,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      lastActiveAt: new Date(),
      expiresAt,
    }));
    return { uuid: session.uuid, token };
  },

  async logout(sessionToken: string, actorUuid: string, ipAddress?: string) {
    const sessionRepo = AppDataSource.getRepository(Session);
    const sessions = await sessionRepo.find({ where: { identityUuid: actorUuid, isActive: true } });

    for (const session of sessions) {
      if (await bcrypt.compare(sessionToken, session.sessionTokenHash)) {
        await sessionRepo.update(session.uuid, { isActive: false });
        await writeAudit({ actorUuid, action: 'auth.logout', resourceType: 'session', resourceUuid: session.uuid, ipAddress });
        return;
      }
    }
  },
};
