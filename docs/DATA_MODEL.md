# Data Model

## Entity Relationship Overview

```
identities ──< credentials
identities ──< sessions
identities ──< access_tokens
identities ──< refresh_tokens
identities ──< consents >── oauth_clients
identities ──< identity_roles >── roles ──< role_entitlements >── entitlements
identities ──< lifecycle_events
identities ──< audit_logs (as actor)

roles ──< policy_role_bindings >── auth_policies
roles ──< sod_policies (as role_a or role_b)
roles >── applications (scoped per app)
entitlements >── applications

oauth_clients >── applications
authorization_codes >── oauth_clients, identities

access_reviews ──< access_review_items >── identities, roles
```

---

## Identity Core

### identities
The canonical user record shared by both Ping and SailPoint sides.

| Column | Type | Notes |
|--------|------|-------|
| uuid | uuid PK | |
| display_name | varchar(200) | |
| email | varchar(200) | nullable, unique |
| phone | varchar(20) | nullable, unique |
| phone_verified | boolean | default false |
| email_verified | boolean | default false |
| status | enum | `active`, `inactive`, `locked`, `pending` |
| identity_type | enum | `person`, `service_account` |
| is_admin | boolean | default false — Porichoy admin |
| metadata | jsonb | default `{}` — extensible attributes |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### credentials
Multiple credential types per identity (supports MFA).

| Column | Type | Notes |
|--------|------|-------|
| uuid | uuid PK | |
| identity_uuid | FK → identities | |
| credential_type | enum | `password`, `otp`, `totp`, `webauthn` |
| credential_hash | text | bcrypt hash (password), null for OTP |
| otp_value | varchar(6) | nullable, temporary |
| otp_expires_at | bigint | nullable, epoch ms |
| is_active | boolean | default true |
| created_at | timestamptz | |
| updated_at | timestamptz | |

---

## Ping Side (IAM) Tables

### oauth_clients
Registered applications that can use Porichoy for auth.

| Column | Type | Notes |
|--------|------|-------|
| uuid | uuid PK | |
| client_id | varchar(100) | unique, public identifier |
| client_secret_hash | text | bcrypt, null for public clients |
| client_name | varchar(200) | |
| client_type | enum | `confidential`, `public` |
| redirect_uris | text[] | allowed callback URIs |
| allowed_scopes | text[] | e.g., `['openid','profile','entitlements']` |
| grant_types | text[] | `['authorization_code','refresh_token']` |
| token_endpoint_auth_method | varchar(50) | `client_secret_basic`, `none` |
| application_uuid | FK → applications | nullable, links to SailPoint side |
| is_active | boolean | default true |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### authorization_codes
Temporary codes for OAuth2 authorization code flow.

| Column | Type | Notes |
|--------|------|-------|
| uuid | uuid PK | |
| code | varchar(256) | unique |
| client_uuid | FK → oauth_clients | |
| identity_uuid | FK → identities | |
| redirect_uri | text | |
| scope | text | |
| code_challenge | text | nullable, PKCE |
| code_challenge_method | varchar(10) | `S256` |
| expires_at | timestamptz | short-lived (10 min) |
| used | boolean | default false |
| created_at | timestamptz | |

### access_tokens
Track issued tokens for revocation.

| Column | Type | Notes |
|--------|------|-------|
| uuid | uuid PK | |
| jti | varchar(100) | unique, JWT ID |
| client_uuid | FK → oauth_clients | |
| identity_uuid | FK → identities | |
| scope | text | |
| expires_at | timestamptz | |
| revoked | boolean | default false |
| created_at | timestamptz | |

### refresh_tokens
Rotation chain for secure token refresh.

| Column | Type | Notes |
|--------|------|-------|
| uuid | uuid PK | |
| token_hash | text | bcrypt |
| client_uuid | FK → oauth_clients | |
| identity_uuid | FK → identities | |
| scope | text | |
| expires_at | timestamptz | |
| revoked | boolean | default false |
| parent_uuid | FK → refresh_tokens | nullable, rotation chain |
| created_at | timestamptz | |

### sessions
Server-side session management.

| Column | Type | Notes |
|--------|------|-------|
| uuid | uuid PK | |
| identity_uuid | FK → identities | |
| session_token_hash | text | |
| ip_address | inet | |
| user_agent | text | |
| last_active_at | timestamptz | |
| expires_at | timestamptz | |
| is_active | boolean | default true |
| created_at | timestamptz | |

### consents
User consent records per OAuth client.

| Column | Type | Notes |
|--------|------|-------|
| uuid | uuid PK | |
| identity_uuid | FK → identities | |
| client_uuid | FK → oauth_clients | |
| scopes_granted | text[] | |
| created_at | timestamptz | |
| revoked_at | timestamptz | nullable |

### auth_policies
Authorization rules (RBAC/ABAC).

| Column | Type | Notes |
|--------|------|-------|
| uuid | uuid PK | |
| name | varchar(200) | |
| description | text | |
| policy_type | enum | `rbac`, `abac` |
| resource | varchar(200) | e.g., `gonok:transactions` |
| action | varchar(100) | e.g., `create`, `read`, `approve` |
| conditions | jsonb | default `{}` — ABAC conditions |
| effect | enum | `allow`, `deny` |
| priority | integer | default 0, higher = evaluated first |
| is_active | boolean | default true |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### policy_role_bindings
Links policies to roles — "this role satisfies this policy."

| Column | Type | Notes |
|--------|------|-------|
| uuid | uuid PK | |
| policy_uuid | FK → auth_policies | |
| role_uuid | FK → roles | |

---

## SailPoint Side (IGA) Tables

### applications
Connected applications managed by Porichoy.

| Column | Type | Notes |
|--------|------|-------|
| uuid | uuid PK | |
| name | varchar(200) | |
| description | text | |
| app_type | enum | `web`, `api`, `mobile` |
| base_url | text | |
| connector_type | enum | `oidc`, `scim`, `api`, `manual` |
| connector_config | jsonb | default `{}` — API URL, keys, sync settings |
| provisioning_enabled | boolean | default false |
| status | enum | `active`, `inactive`, `pending` |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### roles
Application-scoped or global roles.

| Column | Type | Notes |
|--------|------|-------|
| uuid | uuid PK | |
| application_uuid | FK → applications | nullable (null = global) |
| name | varchar(200) | |
| description | text | |
| role_type | enum | `business`, `technical`, `composite` |
| is_requestable | boolean | default true |
| max_duration_days | integer | nullable, auto-expire |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| | | UNIQUE(application_uuid, name) |

### entitlements
Granular permissions within an application.

| Column | Type | Notes |
|--------|------|-------|
| uuid | uuid PK | |
| application_uuid | FK → applications | |
| entitlement_key | varchar(200) | e.g., `gonok:sales:create` |
| display_name | varchar(200) | |
| description | text | |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| | | UNIQUE(application_uuid, entitlement_key) |

### role_entitlements
Maps entitlements to roles.

| Column | Type | Notes |
|--------|------|-------|
| role_uuid | FK → roles | PK |
| entitlement_uuid | FK → entitlements | PK |

### identity_roles
User-to-role assignments with context.

| Column | Type | Notes |
|--------|------|-------|
| uuid | uuid PK | |
| identity_uuid | FK → identities | |
| role_uuid | FK → roles | |
| context | jsonb | default `{}` — e.g., `{ business_uuid: '...' }` |
| granted_by | FK → identities | nullable |
| granted_reason | text | |
| starts_at | timestamptz | default now() |
| expires_at | timestamptz | nullable |
| status | enum | `active`, `pending`, `revoked`, `expired` |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### sod_policies
Separation of Duties — conflicting role pairs.

| Column | Type | Notes |
|--------|------|-------|
| uuid | uuid PK | |
| name | varchar(200) | |
| description | text | |
| conflicting_role_a | FK → roles | |
| conflicting_role_b | FK → roles | |
| enforcement | enum | `prevent`, `warn` |
| is_active | boolean | default true |
| created_at | timestamptz | |

### access_reviews
Periodic certification campaigns.

| Column | Type | Notes |
|--------|------|-------|
| uuid | uuid PK | |
| name | varchar(200) | |
| description | text | |
| application_uuid | FK → applications | nullable (null = all apps) |
| reviewer_uuid | FK → identities | |
| status | enum | `open`, `in_progress`, `completed`, `cancelled` |
| due_date | date | |
| created_at | timestamptz | |
| completed_at | timestamptz | nullable |

### access_review_items
Individual items within a review campaign.

| Column | Type | Notes |
|--------|------|-------|
| uuid | uuid PK | |
| review_uuid | FK → access_reviews | |
| identity_uuid | FK → identities | user being reviewed |
| role_uuid | FK → roles | role being reviewed |
| decision | enum | `approve`, `revoke`, `pending` |
| decided_by | FK → identities | nullable |
| decided_at | timestamptz | nullable |
| comments | text | |

### lifecycle_events
Joiner/Mover/Leaver workflow tracking.

| Column | Type | Notes |
|--------|------|-------|
| uuid | uuid PK | |
| identity_uuid | FK → identities | |
| event_type | enum | `joiner`, `mover`, `leaver` |
| source | varchar(100) | `manual`, `connector`, `api` |
| payload | jsonb | default `{}` |
| status | enum | `pending`, `processing`, `completed`, `failed` |
| created_at | timestamptz | |
| processed_at | timestamptz | nullable |

---

## Shared Tables

### audit_logs
Append-only audit trail. **Never updated or deleted.**

| Column | Type | Notes |
|--------|------|-------|
| uuid | uuid PK | |
| actor_uuid | FK → identities | nullable (null = system) |
| action | varchar(100) | e.g., `role.grant`, `auth.login`, `review.decide` |
| resource_type | varchar(100) | e.g., `identity`, `role`, `session` |
| resource_uuid | uuid | nullable |
| details | jsonb | default `{}` — additional context |
| ip_address | inet | nullable |
| timestamp | timestamptz | default now() |

**Indexes**: `(actor_uuid, timestamp)`, `(resource_type, resource_uuid)`, `(action, timestamp)`
