import {
  AppType,
  ConnectorType,
  ApplicationStatus,
  RoleType,
  IdentityRoleStatus,
  SodEnforcement,
  AccessReviewStatus,
  ReviewDecision,
  LifecycleEventType,
  LifecycleEventStatus,
} from '../enums';

export interface IApplication {
  uuid: string;
  name: string;
  description: string;
  appType: AppType;
  baseUrl: string;
  connectorType: ConnectorType;
  connectorConfig: Record<string, unknown>;
  provisioningEnabled: boolean;
  status: ApplicationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRole {
  uuid: string;
  applicationUuid: string | null;
  name: string;
  description: string;
  roleType: RoleType;
  isRequestable: boolean;
  maxDurationDays: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEntitlement {
  uuid: string;
  applicationUuid: string;
  entitlementKey: string;
  displayName: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IIdentityRole {
  uuid: string;
  identityUuid: string;
  roleUuid: string;
  context: Record<string, unknown>;
  grantedBy: string | null;
  grantedReason: string;
  startsAt: Date;
  expiresAt: Date | null;
  status: IdentityRoleStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISodPolicy {
  uuid: string;
  name: string;
  description: string;
  conflictingRoleA: string;
  conflictingRoleB: string;
  enforcement: SodEnforcement;
  isActive: boolean;
  createdAt: Date;
}

export interface IAccessReview {
  uuid: string;
  name: string;
  description: string;
  applicationUuid: string | null;
  reviewerUuid: string;
  status: AccessReviewStatus;
  dueDate: string;
  createdAt: Date;
  completedAt: Date | null;
}

export interface IAccessReviewItem {
  uuid: string;
  reviewUuid: string;
  identityUuid: string;
  roleUuid: string;
  decision: ReviewDecision;
  decidedBy: string | null;
  decidedAt: Date | null;
  comments: string;
}

export interface ILifecycleEvent {
  uuid: string;
  identityUuid: string;
  eventType: LifecycleEventType;
  source: string;
  payload: Record<string, unknown>;
  status: LifecycleEventStatus;
  createdAt: Date;
  processedAt: Date | null;
}
