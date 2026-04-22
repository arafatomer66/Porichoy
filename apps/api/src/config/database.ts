import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { env } from './env';
import { Identity } from '../entities/identity.entity';
import { Credential } from '../entities/credential.entity';
import { Session } from '../entities/session.entity';
import { OAuthClient } from '../entities/oauth-client.entity';
import { AuthorizationCode } from '../entities/authorization-code.entity';
import { AccessToken } from '../entities/access-token.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { Consent } from '../entities/consent.entity';
import { AuthPolicy } from '../entities/auth-policy.entity';
import { PolicyRoleBinding } from '../entities/policy-role-binding.entity';
import { Application } from '../entities/application.entity';
import { Role } from '../entities/role.entity';
import { Entitlement } from '../entities/entitlement.entity';
import { RoleEntitlement } from '../entities/role-entitlement.entity';
import { IdentityRole } from '../entities/identity-role.entity';
import { SodPolicy } from '../entities/sod-policy.entity';
import { AccessReview } from '../entities/access-review.entity';
import { AccessReviewItem } from '../entities/access-review-item.entity';
import { LifecycleEvent } from '../entities/lifecycle-event.entity';
import { AuditLog } from '../entities/audit-log.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: env.db.host,
  port: env.db.port,
  database: env.db.name,
  username: env.db.user,
  password: env.db.password,
  synchronize: env.db.synchronize,
  logging: env.db.logging,
  entities: [
    Identity, Credential, Session,
    OAuthClient, AuthorizationCode, AccessToken, RefreshToken, Consent,
    AuthPolicy, PolicyRoleBinding,
    Application, Role, Entitlement, RoleEntitlement, IdentityRole,
    SodPolicy, AccessReview, AccessReviewItem, LifecycleEvent,
    AuditLog,
  ],
  migrations: [],
});
