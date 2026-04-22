export interface IAuditLog {
  uuid: string;
  actorUuid: string | null;
  action: string;
  resourceType: string;
  resourceUuid: string | null;
  details: Record<string, unknown>;
  ipAddress: string | null;
  timestamp: Date;
}
