export enum IdentityStatus {
  Active = 'active',
  Inactive = 'inactive',
  Locked = 'locked',
  Pending = 'pending',
}

export enum IdentityType {
  Person = 'person',
  ServiceAccount = 'service_account',
}

export enum CredentialType {
  Password = 'password',
  Otp = 'otp',
  Totp = 'totp',
  WebAuthn = 'webauthn',
}

export enum ClientType {
  Confidential = 'confidential',
  Public = 'public',
}

export enum PolicyType {
  Rbac = 'rbac',
  Abac = 'abac',
}

export enum PolicyEffect {
  Allow = 'allow',
  Deny = 'deny',
}

export enum AppType {
  Web = 'web',
  Api = 'api',
  Mobile = 'mobile',
}

export enum ConnectorType {
  Oidc = 'oidc',
  Scim = 'scim',
  Api = 'api',
  Manual = 'manual',
}

export enum ApplicationStatus {
  Active = 'active',
  Inactive = 'inactive',
  Pending = 'pending',
}

export enum RoleType {
  Business = 'business',
  Technical = 'technical',
  Composite = 'composite',
}

export enum IdentityRoleStatus {
  Active = 'active',
  Pending = 'pending',
  Revoked = 'revoked',
  Expired = 'expired',
}

export enum SodEnforcement {
  Prevent = 'prevent',
  Warn = 'warn',
}

export enum AccessReviewStatus {
  Open = 'open',
  InProgress = 'in_progress',
  Completed = 'completed',
  Cancelled = 'cancelled',
}

export enum ReviewDecision {
  Approve = 'approve',
  Revoke = 'revoke',
  Pending = 'pending',
}

export enum LifecycleEventType {
  Joiner = 'joiner',
  Mover = 'mover',
  Leaver = 'leaver',
}

export enum LifecycleEventStatus {
  Pending = 'pending',
  Processing = 'processing',
  Completed = 'completed',
  Failed = 'failed',
}
