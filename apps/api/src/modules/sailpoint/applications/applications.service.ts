import * as bcrypt from 'bcrypt';
import { In } from 'typeorm';
import { AppDataSource } from '../../../config/database';
import { Application } from '../../../entities/application.entity';
import { Identity } from '../../../entities/identity.entity';
import { Credential } from '../../../entities/credential.entity';
import { IdentityRole } from '../../../entities/identity-role.entity';
import { Role } from '../../../entities/role.entity';
import { IdentityStatus, IdentityType, CredentialType, IdentityRoleStatus } from '@porichoy/shared-types';
import { writeAudit } from '../../../middleware/audit.middleware';

const BCRYPT_ROUNDS = 12;

/** Resolve a dot-notation field path like "contact.email" from an object */
function resolveField(obj: any, path: string): any {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

export interface SyncUserEntry {
  displayName: string;
  email?: string;
  phone?: string;
  password?: string;
  roleName?: string;
  roleUuid?: string;
  metadata?: Record<string, unknown>;
}

export interface SyncResult {
  created: { uuid: string; displayName: string; email?: string }[];
  correlated: { uuid: string; displayName: string; email?: string }[];
  rolesAssigned: { identityUuid: string; roleUuid: string; roleName: string }[];
  errors: { entry: SyncUserEntry; error: string }[];
}

export const ApplicationsService = {
  async list() {
    return AppDataSource.getRepository(Application).find({ order: { createdAt: 'DESC' } });
  },

  async get(uuid: string) {
    return AppDataSource.getRepository(Application).findOneBy({ uuid });
  },

  async create(dto: Partial<Application>, actorUuid?: string, ipAddress?: string) {
    const repo = AppDataSource.getRepository(Application);
    const app = await repo.save(repo.create(dto));
    await writeAudit({ actorUuid, action: 'application.create', resourceType: 'application', resourceUuid: app.uuid, ipAddress });
    return app;
  },

  async update(uuid: string, dto: Partial<Application>, actorUuid?: string, ipAddress?: string) {
    await AppDataSource.getRepository(Application).update(uuid, dto);
    await writeAudit({ actorUuid, action: 'application.update', resourceType: 'application', resourceUuid: uuid, details: dto as Record<string, unknown>, ipAddress });
    return AppDataSource.getRepository(Application).findOneBy({ uuid });
  },

  async delete(uuid: string, actorUuid?: string, ipAddress?: string) {
    await AppDataSource.getRepository(Application).delete(uuid);
    await writeAudit({ actorUuid, action: 'application.delete', resourceType: 'application', resourceUuid: uuid, ipAddress });
  },

  async syncUsers(
    applicationUuid: string,
    users: SyncUserEntry[],
    actorUuid?: string,
    ipAddress?: string,
  ): Promise<SyncResult> {
    const app = await AppDataSource.getRepository(Application).findOneBy({ uuid: applicationUuid });
    if (!app) throw Object.assign(new Error('application_not_found'), { status: 404 });

    const identityRepo = AppDataSource.getRepository(Identity);
    const credRepo = AppDataSource.getRepository(Credential);
    const roleRepo = AppDataSource.getRepository(Role);
    const assignmentRepo = AppDataSource.getRepository(IdentityRole);

    // Pre-load all roles for this app so we can match by name
    const appRoles = await roleRepo.find({ where: { applicationUuid } });
    const rolesByName = new Map(appRoles.map(r => [r.name.toLowerCase(), r]));
    const rolesByUuid = new Map(appRoles.map(r => [r.uuid, r]));

    const result: SyncResult = { created: [], correlated: [], rolesAssigned: [], errors: [] };

    for (const entry of users) {
      try {
        if (!entry.email && !entry.phone) {
          result.errors.push({ entry, error: 'email or phone required' });
          continue;
        }
        if (!entry.displayName) {
          result.errors.push({ entry, error: 'displayName required' });
          continue;
        }

        // Try to correlate by email or phone
        let identity = entry.email
          ? await identityRepo.findOneBy({ email: entry.email })
          : await identityRepo.findOneBy({ phone: entry.phone });

        if (identity) {
          // Existing identity — correlated
          result.correlated.push({ uuid: identity.uuid, displayName: identity.displayName, email: identity.email ?? undefined });
        } else {
          // New identity — create
          identity = identityRepo.create({
            displayName: entry.displayName,
            email: entry.email ?? null,
            phone: entry.phone ?? null,
            identityType: IdentityType.Person,
            status: IdentityStatus.Active,
            metadata: entry.metadata ?? {},
          });
          await identityRepo.save(identity);

          // Create password credential if provided
          if (entry.password) {
            const hash = await bcrypt.hash(entry.password, BCRYPT_ROUNDS);
            await credRepo.save(credRepo.create({
              identityUuid: identity.uuid,
              credentialType: CredentialType.Password,
              credentialHash: hash,
            }));
          }

          await writeAudit({ actorUuid, action: 'identity.sync_create', resourceType: 'identity', resourceUuid: identity.uuid, details: { applicationUuid, source: 'user_sync' }, ipAddress });
          result.created.push({ uuid: identity.uuid, displayName: identity.displayName, email: identity.email ?? undefined });
        }

        // Assign role if specified
        const role = entry.roleUuid
          ? rolesByUuid.get(entry.roleUuid)
          : entry.roleName
            ? rolesByName.get(entry.roleName.toLowerCase())
            : undefined;

        if (role) {
          // Check if already assigned
          const existing = await assignmentRepo.findOneBy({
            identityUuid: identity.uuid,
            roleUuid: role.uuid,
            status: IdentityRoleStatus.Active,
          });

          if (!existing) {
            await assignmentRepo.save(assignmentRepo.create({
              identityUuid: identity.uuid,
              roleUuid: role.uuid,
              grantedBy: actorUuid ?? null,
              grantedReason: `User sync for ${app.name}`,
              status: IdentityRoleStatus.Active,
            }));
            await writeAudit({ actorUuid, action: 'role.grant', resourceType: 'identity_role', details: { identityUuid: identity.uuid, roleUuid: role.uuid, source: 'user_sync' }, ipAddress });
            result.rolesAssigned.push({ identityUuid: identity.uuid, roleUuid: role.uuid, roleName: role.name });
          }
        } else if (entry.roleName || entry.roleUuid) {
          result.errors.push({ entry, error: `Role not found: ${entry.roleName ?? entry.roleUuid}` });
        }
      } catch (err: any) {
        result.errors.push({ entry, error: err.message });
      }
    }

    await writeAudit({
      actorUuid,
      action: 'application.sync_users',
      resourceType: 'application',
      resourceUuid: applicationUuid,
      details: { created: result.created.length, correlated: result.correlated.length, rolesAssigned: result.rolesAssigned.length, errors: result.errors.length },
      ipAddress,
    });

    return result;
  },

  async listAppRoles(applicationUuid: string) {
    return AppDataSource.getRepository(Role).find({ where: { applicationUuid }, order: { name: 'ASC' } });
  },

  async previewAppUsers(applicationUuid: string) {
    const app = await AppDataSource.getRepository(Application).findOneBy({ uuid: applicationUuid });
    if (!app) throw Object.assign(new Error('application_not_found'), { status: 404 });
    if (!app.baseUrl) throw Object.assign(new Error('application has no base URL configured'), { status: 400 });

    const config = app.connectorConfig as Record<string, any>;
    const usersEndpoint = config.usersEndpoint ?? '/api/users';
    const usersPath = config.usersPath ?? 'users';
    const url = `${app.baseUrl}${usersEndpoint}`;

    const headers: Record<string, string> = { 'Accept': 'application/json' };
    if (config.authHeader) headers['Authorization'] = config.authHeader;

    let response: globalThis.Response;
    try {
      response = await fetch(url, { headers });
    } catch (err: any) {
      throw Object.assign(new Error(`Cannot reach ${url}: ${err.message}`), { status: 502 });
    }

    if (!response.ok) {
      throw Object.assign(new Error(`App API returned ${response.status}`), { status: 502 });
    }

    const data = await response.json();

    // Extract users array
    let appUsers: any[] = usersPath.split('.').reduce((obj: any, key: string) => obj?.[key], data);
    if (!Array.isArray(appUsers)) appUsers = Array.isArray(data) ? data : [];

    // Flatten all unique field keys from all users (handles nested with dot notation)
    const fieldSet = new Set<string>();
    const flattenKeys = (obj: any, prefix = '') => {
      for (const [k, v] of Object.entries(obj ?? {})) {
        const path = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          flattenKeys(v, path);
        } else {
          fieldSet.add(path);
        }
      }
    };
    for (const u of appUsers) flattenKeys(u);

    // Get unique role values from the data
    const roleField = config.fieldMap?.role ?? 'role';
    const roleValues = [...new Set(appUsers.map(u => resolveField(u, roleField)).filter(Boolean))];

    return {
      url,
      totalUsers: appUsers.length,
      fields: [...fieldSet].sort(),
      roleValues,
      sampleUser: appUsers[0] ?? null,
      sampleUsers: appUsers.slice(0, 3),
    };
  },

  async syncFromApi(
    applicationUuid: string,
    roleMapping: Record<string, string>,
    actorUuid?: string,
    ipAddress?: string,
  ): Promise<SyncResult & { fetchedCount: number }> {
    const app = await AppDataSource.getRepository(Application).findOneBy({ uuid: applicationUuid });
    if (!app) throw Object.assign(new Error('application_not_found'), { status: 404 });

    const config = app.connectorConfig as {
      usersEndpoint?: string;        // e.g. "/api/users"
      usersPath?: string;            // e.g. "users" — JSON path to the array in response
      fieldMap?: {                   // maps app fields → Porichoy fields
        displayName?: string;        // e.g. "name"
        email?: string;              // e.g. "email"
        phone?: string;              // e.g. "phone"
        role?: string;               // e.g. "role"
      };
      authHeader?: string;           // e.g. "Bearer <token>" for the app API
    };

    const usersEndpoint = config.usersEndpoint ?? '/api/users';
    const url = `${app.baseUrl}${usersEndpoint}`;

    // Fetch users from the connected app
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    if (config.authHeader) headers['Authorization'] = config.authHeader;

    let response: Response;
    try {
      response = await fetch(url, { headers });
    } catch (err: any) {
      throw Object.assign(new Error(`Failed to connect to ${url}: ${err.message}`), { status: 502 });
    }

    if (!response.ok) {
      throw Object.assign(new Error(`App API returned ${response.status}: ${response.statusText}`), { status: 502 });
    }

    const data = await response.json();

    // Extract the users array from the response using usersPath
    const usersPath = config.usersPath ?? 'users';
    let appUsers: any[] = usersPath.split('.').reduce((obj: any, key: string) => obj?.[key], data);
    if (!Array.isArray(appUsers)) {
      // If root is already an array
      appUsers = Array.isArray(data) ? data : [];
    }

    // Map app fields to Porichoy fields
    const fm = config.fieldMap ?? { displayName: 'name', email: 'email', phone: 'phone', role: 'role' };

    const syncEntries: SyncUserEntry[] = appUsers.map((u: any) => ({
      displayName: resolveField(u, fm.displayName ?? 'name') ?? resolveField(u, 'displayName') ?? resolveField(u, 'name') ?? '',
      email: resolveField(u, fm.email ?? 'email') ?? resolveField(u, 'email') ?? undefined,
      phone: resolveField(u, fm.phone ?? 'phone') ?? resolveField(u, 'phone') ?? undefined,
      roleName: roleMapping[resolveField(u, fm.role ?? 'role')] ?? undefined,
      metadata: { sourceApp: app.name, sourceId: resolveField(u, 'id') ?? resolveField(u, 'uuid') ?? undefined },
    }));

    const result = await ApplicationsService.syncUsers(applicationUuid, syncEntries, actorUuid, ipAddress);
    return { ...result, fetchedCount: appUsers.length };
  },
};
