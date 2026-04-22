import {
  IdentityStatus,
  IdentityType,
  CredentialType,
} from '../enums';

export interface IIdentity {
  uuid: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  phoneVerified: boolean;
  emailVerified: boolean;
  status: IdentityStatus;
  identityType: IdentityType;
  isAdmin: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICredential {
  uuid: string;
  identityUuid: string;
  credentialType: CredentialType;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISession {
  uuid: string;
  identityUuid: string;
  ipAddress: string;
  userAgent: string;
  lastActiveAt: Date;
  expiresAt: Date;
  isActive: boolean;
  createdAt: Date;
}
