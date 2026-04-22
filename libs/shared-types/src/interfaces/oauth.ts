import { ClientType, PolicyType, PolicyEffect } from '../enums';

export interface IOAuthClient {
  uuid: string;
  clientId: string;
  clientName: string;
  clientType: ClientType;
  redirectUris: string[];
  allowedScopes: string[];
  grantTypes: string[];
  tokenEndpointAuthMethod: string;
  applicationUuid: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAuthorizationCode {
  uuid: string;
  code: string;
  clientUuid: string;
  identityUuid: string;
  redirectUri: string;
  scope: string;
  codeChallenge: string | null;
  codeChallengeMethod: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

export interface IAccessToken {
  uuid: string;
  jti: string;
  clientUuid: string;
  identityUuid: string;
  scope: string;
  expiresAt: Date;
  revoked: boolean;
  createdAt: Date;
}

export interface IAuthPolicy {
  uuid: string;
  name: string;
  description: string;
  policyType: PolicyType;
  resource: string;
  action: string;
  conditions: Record<string, unknown>;
  effect: PolicyEffect;
  priority: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAuthzEvaluateRequest {
  identityUuid: string;
  resource: string;
  action: string;
  context?: Record<string, unknown>;
}

export interface IAuthzEvaluateResponse {
  allowed: boolean;
  reasons: string[];
}
