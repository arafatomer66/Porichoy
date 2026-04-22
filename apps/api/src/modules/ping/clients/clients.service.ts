import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { AppDataSource } from '../../../config/database';
import { OAuthClient } from '../../../entities/oauth-client.entity';
import { ClientType } from '@porichoy/shared-types';

export const ClientsService = {
  async list() {
    return AppDataSource.getRepository(OAuthClient).find({ order: { createdAt: 'DESC' } });
  },

  async get(uuid: string) {
    return AppDataSource.getRepository(OAuthClient).findOneBy({ uuid });
  },

  async create(dto: Partial<OAuthClient>) {
    const repo = AppDataSource.getRepository(OAuthClient);
    const clientId = dto.clientId ?? crypto.randomBytes(12).toString('base64url');
    let clientSecretRaw: string | undefined;
    let clientSecretHash: string | null = null;

    if (dto.clientType === ClientType.Confidential) {
      clientSecretRaw = crypto.randomBytes(32).toString('base64url');
      clientSecretHash = await bcrypt.hash(clientSecretRaw, 10);
    }

    const client = repo.create({ ...dto, clientId, clientSecretHash });
    await repo.save(client);
    return { ...client, ...(clientSecretRaw ? { clientSecret: clientSecretRaw } : {}) };
  },

  async update(uuid: string, dto: Partial<OAuthClient>) {
    await AppDataSource.getRepository(OAuthClient).update(uuid, dto);
    return AppDataSource.getRepository(OAuthClient).findOneBy({ uuid });
  },

  async delete(uuid: string) {
    await AppDataSource.getRepository(OAuthClient).delete(uuid);
  },

  async rotateSecret(uuid: string) {
    const newSecret = crypto.randomBytes(32).toString('base64url');
    const hash = await bcrypt.hash(newSecret, 10);
    await AppDataSource.getRepository(OAuthClient).update(uuid, { clientSecretHash: hash });
    return { clientSecret: newSecret };
  },
};
