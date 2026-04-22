import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import { AppDataSource } from './config/database';
import { Identity } from './entities/identity.entity';
import { Credential } from './entities/credential.entity';
import { Application } from './entities/application.entity';
import { Role } from './entities/role.entity';
import { Entitlement } from './entities/entitlement.entity';
import { RoleEntitlement } from './entities/role-entitlement.entity';
import { IdentityRole } from './entities/identity-role.entity';
import { OAuthClient } from './entities/oauth-client.entity';
import { SodPolicy } from './entities/sod-policy.entity';
import { AccessReview } from './entities/access-review.entity';
import { AccessReviewItem } from './entities/access-review-item.entity';
import { AuthPolicy } from './entities/auth-policy.entity';
import { PolicyRoleBinding } from './entities/policy-role-binding.entity';
import { AuditLog } from './entities/audit-log.entity';
import {
  IdentityStatus, IdentityType, CredentialType, ClientType,
  AppType, ConnectorType, ApplicationStatus, RoleType,
  IdentityRoleStatus, SodEnforcement, AccessReviewStatus, ReviewDecision,
  PolicyType, PolicyEffect,
} from '@porichoy/shared-types';

async function seed() {
  await AppDataSource.initialize();
  console.log('Connected to database');

  /* ── 1. Identities ── */
  const identityRepo = AppDataSource.getRepository(Identity);
  const credRepo     = AppDataSource.getRepository(Credential);

  const admin = identityRepo.create({
    displayName: 'Porichoy Admin',
    email: 'admin@porichoy.com',
    identityType: IdentityType.Person,
    status: IdentityStatus.Active,
    isAdmin: true,
    emailVerified: true,
  });
  await identityRepo.save(admin);
  await credRepo.save(credRepo.create({
    identityUuid: admin.uuid,
    credentialType: CredentialType.Password,
    credentialHash: await bcrypt.hash('admin123', 12),
  }));
  console.log(`Admin created: admin@porichoy.com / admin123`);

  const alice = identityRepo.create({
    displayName: 'Alice Rahman',
    email: 'alice@gonok.com',
    phone: '+8801700000001',
    identityType: IdentityType.Person,
    status: IdentityStatus.Active,
    emailVerified: true,
  });
  await identityRepo.save(alice);
  await credRepo.save(credRepo.create({
    identityUuid: alice.uuid,
    credentialType: CredentialType.Password,
    credentialHash: await bcrypt.hash('alice123', 12),
  }));

  const bob = identityRepo.create({
    displayName: 'Bob Hossain',
    email: 'bob@gonok.com',
    identityType: IdentityType.Person,
    status: IdentityStatus.Active,
    emailVerified: true,
  });
  await identityRepo.save(bob);
  await credRepo.save(credRepo.create({
    identityUuid: bob.uuid,
    credentialType: CredentialType.Password,
    credentialHash: await bcrypt.hash('bob123', 12),
  }));

  const carol = identityRepo.create({
    displayName: 'Carol Begum',
    email: 'carol@gonok.com',
    identityType: IdentityType.Person,
    status: IdentityStatus.Inactive,
    emailVerified: true,
  });
  await identityRepo.save(carol);

  const svc = identityRepo.create({
    displayName: 'Gonok API Service',
    email: null,
    identityType: IdentityType.ServiceAccount,
    status: IdentityStatus.Active,
  });
  await identityRepo.save(svc);

  console.log('Identities: alice, bob, carol, service account');

  /* ── 2. Application ── */
  const appRepo = AppDataSource.getRepository(Application);
  const gonok = appRepo.create({
    name: 'Gonok',
    description: 'Small business ERP — sales, finance, inventory',
    appType: AppType.Web,
    baseUrl: 'http://localhost:3333',
    connectorType: ConnectorType.Oidc,
    connectorConfig: { clientId: 'gonok-web', scope: 'openid profile email entitlements' },
    provisioningEnabled: false,
    status: ApplicationStatus.Active,
  });
  await appRepo.save(gonok);

  const internalApp = appRepo.create({
    name: 'Porichoy Admin Portal',
    description: 'Internal admin UI',
    appType: AppType.Web,
    baseUrl: 'http://localhost:3401',
    connectorType: ConnectorType.Manual,
    connectorConfig: {},
    provisioningEnabled: false,
    status: ApplicationStatus.Active,
  });
  await appRepo.save(internalApp);
  console.log('Applications: Gonok, Porichoy Admin Portal');

  /* ── 3. Roles ── */
  const roleRepo = AppDataSource.getRepository(Role);

  const roleSalesManager = roleRepo.create({
    applicationUuid: gonok.uuid,
    name: 'Sales Manager',
    description: 'Can create and approve sales transactions',
    roleType: RoleType.Business,
    isRequestable: true,
    maxDurationDays: 365,
  });
  await roleRepo.save(roleSalesManager);

  const roleFinanceOfficer = roleRepo.create({
    applicationUuid: gonok.uuid,
    name: 'Finance Officer',
    description: 'Can view and approve financial reports',
    roleType: RoleType.Business,
    isRequestable: true,
    maxDurationDays: null,
  });
  await roleRepo.save(roleFinanceOfficer);

  const roleInventoryClerk = roleRepo.create({
    applicationUuid: gonok.uuid,
    name: 'Inventory Clerk',
    description: 'Can manage stock and inventory',
    roleType: RoleType.Technical,
    isRequestable: true,
    maxDurationDays: 180,
  });
  await roleRepo.save(roleInventoryClerk);

  const roleAuditor = roleRepo.create({
    applicationUuid: gonok.uuid,
    name: 'Auditor',
    description: 'Read-only access to all Gonok data for audit purposes',
    roleType: RoleType.Business,
    isRequestable: false,
    maxDurationDays: 90,
  });
  await roleRepo.save(roleAuditor);

  const roleGlobalAdmin = roleRepo.create({
    applicationUuid: null,
    name: 'Global Admin',
    description: 'Full access across all applications',
    roleType: RoleType.Composite,
    isRequestable: false,
    maxDurationDays: null,
  });
  await roleRepo.save(roleGlobalAdmin);

  console.log('Roles: Sales Manager, Finance Officer, Inventory Clerk, Auditor, Global Admin');

  /* ── 4. Entitlements ── */
  const entRepo = AppDataSource.getRepository(Entitlement);

  const entitlements = await entRepo.save([
    entRepo.create({ applicationUuid: gonok.uuid, entitlementKey: 'gonok:transactions:read',   displayName: 'View Transactions',    description: 'Read all transaction records' }),
    entRepo.create({ applicationUuid: gonok.uuid, entitlementKey: 'gonok:transactions:create', displayName: 'Create Transactions',  description: 'Create new sales transactions' }),
    entRepo.create({ applicationUuid: gonok.uuid, entitlementKey: 'gonok:transactions:approve',displayName: 'Approve Transactions', description: 'Approve pending transactions' }),
    entRepo.create({ applicationUuid: gonok.uuid, entitlementKey: 'gonok:finance:read',        displayName: 'View Finance Reports', description: 'Read financial reports' }),
    entRepo.create({ applicationUuid: gonok.uuid, entitlementKey: 'gonok:finance:approve',     displayName: 'Approve Finance',     description: 'Approve financial actions' }),
    entRepo.create({ applicationUuid: gonok.uuid, entitlementKey: 'gonok:inventory:read',      displayName: 'View Inventory',      description: 'Read stock levels' }),
    entRepo.create({ applicationUuid: gonok.uuid, entitlementKey: 'gonok:inventory:write',     displayName: 'Manage Inventory',    description: 'Update stock and inventory' }),
    entRepo.create({ applicationUuid: gonok.uuid, entitlementKey: 'gonok:reports:read',        displayName: 'View Reports',        description: 'Access all reports (read-only)' }),
  ]);
  const [entTxRead, entTxCreate, entTxApprove, entFinRead, entFinApprove, entInvRead, entInvWrite, entReports] = entitlements;
  console.log('Entitlements: 8 created');

  /* ── 5. Role ↔ Entitlement mappings ── */
  const reRepo = AppDataSource.getRepository(RoleEntitlement);
  await reRepo.save([
    // Sales Manager: read + create + approve transactions
    reRepo.create({ roleUuid: roleSalesManager.uuid,    entitlementUuid: entTxRead.uuid }),
    reRepo.create({ roleUuid: roleSalesManager.uuid,    entitlementUuid: entTxCreate.uuid }),
    reRepo.create({ roleUuid: roleSalesManager.uuid,    entitlementUuid: entTxApprove.uuid }),
    // Finance Officer: finance read + approve + tx read
    reRepo.create({ roleUuid: roleFinanceOfficer.uuid,  entitlementUuid: entFinRead.uuid }),
    reRepo.create({ roleUuid: roleFinanceOfficer.uuid,  entitlementUuid: entFinApprove.uuid }),
    reRepo.create({ roleUuid: roleFinanceOfficer.uuid,  entitlementUuid: entTxRead.uuid }),
    // Inventory Clerk: inventory read + write
    reRepo.create({ roleUuid: roleInventoryClerk.uuid,  entitlementUuid: entInvRead.uuid }),
    reRepo.create({ roleUuid: roleInventoryClerk.uuid,  entitlementUuid: entInvWrite.uuid }),
    // Auditor: all read-only
    reRepo.create({ roleUuid: roleAuditor.uuid,         entitlementUuid: entTxRead.uuid }),
    reRepo.create({ roleUuid: roleAuditor.uuid,         entitlementUuid: entFinRead.uuid }),
    reRepo.create({ roleUuid: roleAuditor.uuid,         entitlementUuid: entInvRead.uuid }),
    reRepo.create({ roleUuid: roleAuditor.uuid,         entitlementUuid: entReports.uuid }),
  ]);
  console.log('Role-entitlement mappings done');

  /* ── 6. Identity → Role assignments ── */
  const irRepo = AppDataSource.getRepository(IdentityRole);
  await irRepo.save([
    irRepo.create({ identityUuid: alice.uuid, roleUuid: roleSalesManager.uuid,   grantedBy: admin.uuid, grantedReason: 'Initial onboarding', status: IdentityRoleStatus.Active }),
    irRepo.create({ identityUuid: alice.uuid, roleUuid: roleInventoryClerk.uuid, grantedBy: admin.uuid, grantedReason: 'Dual role — pilot',  status: IdentityRoleStatus.Active }),
    irRepo.create({ identityUuid: bob.uuid,   roleUuid: roleFinanceOfficer.uuid, grantedBy: admin.uuid, grantedReason: 'Initial onboarding', status: IdentityRoleStatus.Active }),
    irRepo.create({ identityUuid: bob.uuid,   roleUuid: roleAuditor.uuid,        grantedBy: admin.uuid, grantedReason: 'Quarterly audit',    status: IdentityRoleStatus.Active,
      expiresAt: new Date(Date.now() + 90 * 86400 * 1000) }),
    irRepo.create({ identityUuid: admin.uuid, roleUuid: roleGlobalAdmin.uuid,    grantedBy: admin.uuid, grantedReason: 'System bootstrap',   status: IdentityRoleStatus.Active }),
  ]);
  console.log('Role assignments: alice→SalesManager+InventoryClerk, bob→FinanceOfficer+Auditor, admin→GlobalAdmin');

  /* ── 7. OAuth Client ── */
  const clientRepo = AppDataSource.getRepository(OAuthClient);
  await clientRepo.save(clientRepo.create({
    clientId: 'gonok-web',
    clientName: 'Gonok Web App',
    clientType: ClientType.Public,
    clientSecretHash: null,
    redirectUris: ['http://localhost:3333/auth/callback', 'http://localhost:3333'],
    allowedScopes: ['openid', 'profile', 'email', 'entitlements'],
    grantTypes: ['authorization_code', 'refresh_token'],
    tokenEndpointAuthMethod: 'none',
    applicationUuid: gonok.uuid,
    isActive: true,
  }));
  console.log('OAuth client: gonok-web (public)');

  /* ── 8. SoD Policy ── */
  const sodRepo = AppDataSource.getRepository(SodPolicy);
  await sodRepo.save(sodRepo.create({
    name: 'Sales ↔ Finance Conflict',
    description: 'Sales Manager and Finance Officer cannot be held by the same person',
    conflictingRoleA: roleSalesManager.uuid,
    conflictingRoleB: roleFinanceOfficer.uuid,
    enforcement: SodEnforcement.Prevent,
    isActive: true,
  }));
  console.log('SoD policy: Sales Manager ↔ Finance Officer (prevent)');

  /* ── 9. Auth Policy ── */
  const policyRepo = AppDataSource.getRepository(AuthPolicy);
  const bindingRepo = AppDataSource.getRepository(PolicyRoleBinding);

  const txCreatePolicy = await policyRepo.save(policyRepo.create({
    name: 'Allow Transaction Creation',
    description: 'Sales Manager can create transactions',
    policyType: PolicyType.Rbac,
    resource: 'gonok:transactions',
    action: 'create',
    effect: PolicyEffect.Allow,
    priority: 10,
    isActive: true,
  }));
  await bindingRepo.save(bindingRepo.create({ policyUuid: txCreatePolicy.uuid, roleUuid: roleSalesManager.uuid }));

  const finApprovePolicy = await policyRepo.save(policyRepo.create({
    name: 'Allow Finance Approval',
    description: 'Finance Officer can approve financial actions',
    policyType: PolicyType.Rbac,
    resource: 'gonok:finance',
    action: 'approve',
    effect: PolicyEffect.Allow,
    priority: 10,
    isActive: true,
  }));
  await bindingRepo.save(bindingRepo.create({ policyUuid: finApprovePolicy.uuid, roleUuid: roleFinanceOfficer.uuid }));
  console.log('Auth policies: 2 created');

  /* ── 10. Access Review ── */
  const reviewRepo = AppDataSource.getRepository(AccessReview);
  const itemRepo   = AppDataSource.getRepository(AccessReviewItem);

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  const review = await reviewRepo.save(reviewRepo.create({
    name: 'Q2 2026 Gonok Access Review',
    description: 'Quarterly certification of all Gonok role assignments',
    applicationUuid: gonok.uuid,
    reviewerUuid: admin.uuid,
    status: AccessReviewStatus.Open,
    dueDate: dueDate.toISOString().split('T')[0],
  }));

  await itemRepo.save([
    itemRepo.create({ reviewUuid: review.uuid, identityUuid: alice.uuid, roleUuid: roleSalesManager.uuid,   decision: ReviewDecision.Pending }),
    itemRepo.create({ reviewUuid: review.uuid, identityUuid: alice.uuid, roleUuid: roleInventoryClerk.uuid, decision: ReviewDecision.Pending }),
    itemRepo.create({ reviewUuid: review.uuid, identityUuid: bob.uuid,   roleUuid: roleFinanceOfficer.uuid, decision: ReviewDecision.Pending }),
    itemRepo.create({ reviewUuid: review.uuid, identityUuid: bob.uuid,   roleUuid: roleAuditor.uuid,        decision: ReviewDecision.Pending }),
  ]);
  console.log('Access review: Q2 2026 (4 pending items)');

  /* ── 11. Audit log samples ── */
  const auditRepo = AppDataSource.getRepository(AuditLog);
  await auditRepo.save([
    auditRepo.create({ actorUuid: admin.uuid, action: 'auth.register',    resourceType: 'identity', resourceUuid: admin.uuid, details: { email: 'admin@porichoy.com' }, ipAddress: '127.0.0.1' }),
    auditRepo.create({ actorUuid: admin.uuid, action: 'auth.register',    resourceType: 'identity', resourceUuid: alice.uuid, details: { email: 'alice@gonok.com' }, ipAddress: '127.0.0.1' }),
    auditRepo.create({ actorUuid: admin.uuid, action: 'application.create', resourceType: 'application', resourceUuid: gonok.uuid, details: { name: 'Gonok' }, ipAddress: '127.0.0.1' }),
    auditRepo.create({ actorUuid: admin.uuid, action: 'role.grant',       resourceType: 'identity_role', resourceUuid: alice.uuid, details: { role: 'Sales Manager' }, ipAddress: '127.0.0.1' }),
    auditRepo.create({ actorUuid: admin.uuid, action: 'role.grant',       resourceType: 'identity_role', resourceUuid: bob.uuid,   details: { role: 'Finance Officer' }, ipAddress: '127.0.0.1' }),
    auditRepo.create({ actorUuid: admin.uuid, action: 'review.create',    resourceType: 'access_review', resourceUuid: review.uuid, details: { name: 'Q2 2026' }, ipAddress: '127.0.0.1' }),
  ]);
  console.log('Audit log samples inserted');

  /* ── Summary ── */
  console.log('\n✅ Seed complete!\n');
  console.log('Login credentials:');
  console.log('  Admin  → admin@porichoy.com / admin123');
  console.log('  Alice  → alice@gonok.com    / alice123  (Sales Manager + Inventory Clerk)');
  console.log('  Bob    → bob@gonok.com      / bob123    (Finance Officer + Auditor)');
  console.log('  Carol  → carol@gonok.com    / —         (inactive, no password)');
  console.log('\nApp: Gonok (gonok-web OAuth client, 8 entitlements, 4 roles)');

  await AppDataSource.destroy();
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
