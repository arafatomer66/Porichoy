# Architecture

## Overview

Porichoy is a single deployable service with two logical subsystems (**Ping** and **SailPoint**) that share a PostgreSQL database and a common **Identity Core**. They are module boundaries within one Express backend and one Angular frontend — not separate microservices.

## System Diagram

```
  Connected Apps (Gonok, etc.)
         │
         │  OIDC / OAuth2 / Connector API
         ▼
┌─────────────────────────────────────────────────┐
│                  Porichoy                        │
│                                                  │
│  ┌─────────────────┐   ┌─────────────────────┐  │
│  │   Ping Side     │   │   SailPoint Side     │  │
│  │   (IAM)         │   │   (IGA)              │  │
│  │                 │   │                      │  │
│  │ ┌─────────────┐ │   │ ┌──────────────────┐ │  │
│  │ │ Auth Module  │ │   │ │ App Onboarding   │ │  │
│  │ │ - Register   │ │   │ │ - Register apps  │ │  │
│  │ │ - Login/OTP  │ │   │ │ - Connectors     │ │  │
│  │ │ - MFA        │ │   │ │ - User sync      │ │  │
│  │ └─────────────┘ │   │ └──────────────────┘ │  │
│  │                 │   │                      │  │
│  │ ┌─────────────┐ │   │ ┌──────────────────┐ │  │
│  │ │ OAuth/OIDC  │ │   │ │ Role Management  │ │  │
│  │ │ - Authorize  │ │   │ │ - Roles          │ │  │
│  │ │ - Token      │ │   │ │ - Entitlements   │ │  │
│  │ │ - JWKS       │ │   │ │ - Assignments    │ │  │
│  │ │ - UserInfo   │ │   │ │ - SoD policies   │ │  │
│  │ └─────────────┘ │   │ └──────────────────┘ │  │
│  │                 │   │                      │  │
│  │ ┌─────────────┐ │   │ ┌──────────────────┐ │  │
│  │ │ AuthZ       │ │   │ │ Access Reviews   │ │  │
│  │ │ - Policies   │ │   │ │ - Campaigns      │ │  │
│  │ │ - Evaluation │ │   │ │ - Certifications │ │  │
│  │ └─────────────┘ │   │ └──────────────────┘ │  │
│  │                 │   │                      │  │
│  │ ┌─────────────┐ │   │ ┌──────────────────┐ │  │
│  │ │ Sessions    │ │   │ │ Lifecycle        │ │  │
│  │ │ - Create     │ │   │ │ - Joiner         │ │  │
│  │ │ - Revoke     │ │   │ │ - Mover          │ │  │
│  │ │ - List       │ │   │ │ - Leaver         │ │  │
│  │ └─────────────┘ │   │ └──────────────────┘ │  │
│  └────────┬────────┘   └──────────┬───────────┘  │
│           │                       │               │
│           └───── Identity Core ───┘               │
│                  │                                │
│           ┌──────┴──────────┐                     │
│           │ Shared Services │                     │
│           │ - Audit Log     │                     │
│           │ - Notifications │                     │
│           └──────┬──────────┘                     │
└──────────────────┼────────────────────────────────┘
                   │
              PostgreSQL
```

## How Ping + SailPoint Interact

The two sides are NOT independent — they collaborate at a critical junction: **token issuance**.

### The Token Bridge

When Ping issues an access token (during OAuth2 token exchange), it queries SailPoint's data:

```
Token Request → Ping (OAuth Module)
                  │
                  ├─ Validates authorization code
                  ├─ Validates PKCE challenge
                  │
                  ├─ Queries SailPoint data:
                  │    SELECT ir.*, r.name, re.entitlement_key
                  │    FROM identity_roles ir
                  │    JOIN roles r ON ir.role_uuid = r.uuid
                  │    JOIN role_entitlements re ON r.uuid = re.role_uuid
                  │    JOIN entitlements e ON re.entitlement_uuid = e.uuid
                  │    WHERE ir.identity_uuid = :user
                  │      AND r.application_uuid = :app
                  │      AND ir.status = 'active'
                  │
                  ├─ Embeds entitlements in access_token claims
                  │
                  └─ Returns signed JWT
```

### The Authorization Bridge

When Ping evaluates an authorization request (`POST /authz/evaluate`), it also queries SailPoint:

```
{ identity: "user-uuid", resource: "app:transactions", action: "create" }
                  │
                  ├─ Ping loads auth_policies matching resource + action
                  ├─ Ping checks policy_role_bindings → required roles
                  ├─ Ping queries SailPoint's identity_roles for this user
                  ├─ Match? → { allowed: true }
                  │
                  └─ No match? → { allowed: false, reasons: [...] }
```

## Identity Core

The shared foundation both sides reference:

```
identities (canonical user record)
  ├── credentials (password, OTP, TOTP, WebAuthn)
  ├── sessions (Ping manages)
  ├── identity_roles (SailPoint manages)
  ├── consents (Ping manages)
  └── audit_logs (both sides write)
```

- **Ping** creates/authenticates identities, manages their sessions and tokens
- **SailPoint** assigns roles to identities, reviews their access, manages their lifecycle

## Deployment Topology

### Development
```
docker-compose.yml:
  postgres:5432     (Porichoy database)
  porichoy-api:3400 (Express backend)
  porichoy-web:3401 (Angular frontend)
```

### Production (alongside Gonok)
```
docker-compose.yml:
  postgres:5432
  ├── database: porichoy  (Porichoy data)
  └── database: gonok     (Gonok auth data)
  couchdb:5984            (Gonok business data)
  gonok-api:3333
  gonok-web:80
  porichoy-api:3400
  porichoy-web:3401
```

## Security Model

| Aspect | Approach |
|--------|----------|
| Token signing | RS256 (asymmetric) — private key signs, public JWKS validates |
| Token storage | Access tokens tracked in DB for revocation; refresh tokens stored as bcrypt hashes |
| PKCE | Required for all public clients (SPAs) |
| Sessions | Server-side, httpOnly secure cookies |
| Audit | Append-only audit_logs table, never modified or deleted |
| Secrets | Environment variables, never in code |
| CORS | Configurable per OAuth client |

## Design Decisions

1. **Single service, not microservices**: Operational simplicity for small businesses. Module boundaries in code provide sufficient separation. Can extract later if needed.

2. **RS256 over HS256**: Connected apps validate tokens using Porichoy's public JWKS without needing a shared secret. Standard OIDC practice.

3. **Entitlements in tokens**: Rather than requiring apps to call `/authz/evaluate` on every request, the access token carries entitlements. Pragmatic for performance. Complex ABAC decisions can still use the evaluation endpoint.

4. **Append-only audit**: Tamper-proof trail. Critical for compliance and governance.

5. **Context-aware roles**: `identity_roles` includes a `context` JSONB field (e.g., `{ business_uuid }`) to support multi-tenant apps where a user has different roles per tenant.
