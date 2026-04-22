# Connector Spec

## Overview

A **connector** is how Porichoy links an external application into the identity governance lifecycle. It controls:

1. **How users authenticate** into the app via Porichoy
2. **How roles and entitlements** are synced or governed
3. **How provisioning** (if enabled) pushes access changes to the app

Each application registered in Porichoy has a `connectorType`:

| Type | Description |
|------|-------------|
| `oidc` | App delegates login to Porichoy via OpenID Connect. Entitlements travel in the JWT. |
| `api` | Porichoy calls the app's API to provision/deprovision users (future). |
| `scim` | Standard SCIM 2.0 provisioning (future). |
| `manual` | Governance only — Porichoy tracks roles/entitlements but takes no automated action. |

---

## OIDC Connector (Most Common)

Use this when your app needs login via Porichoy and wants entitlements embedded in the JWT.

### Step 1 — Register the Application

```http
POST /applications
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Gonok",
  "description": "Small business ERP",
  "appType": "web",
  "baseUrl": "http://localhost:3333",
  "connectorType": "oidc",
  "connectorConfig": {},
  "provisioningEnabled": false
}
```

Save the returned `uuid` — you'll need it for the OAuth client.

### Step 2 — Register an OAuth Client

```http
POST /clients
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "clientName": "Gonok Web",
  "clientType": "public",
  "redirectUris": ["http://localhost:3333/auth/callback"],
  "allowedScopes": ["openid", "profile", "email", "entitlements"],
  "grantTypes": ["authorization_code", "refresh_token"],
  "applicationUuid": "<application_uuid_from_step_1>"
}
```

For a public client (SPA), `clientType: "public"` — no client secret is needed. For a server-side app, use `"confidential"` and store the returned `clientSecret` securely.

Save the returned `clientId` (e.g., `gonok-web`).

### Step 3 — Define Roles and Entitlements

Model your app's permission system in Porichoy:

```http
# Create an entitlement
POST /roles/entitlements
{ "applicationUuid": "<uuid>", "entitlementKey": "gonok:transactions:create", "displayName": "Create Transactions" }

# Create a role
POST /roles
{ "applicationUuid": "<uuid>", "name": "Sales Manager", "roleType": "business", "isRequestable": true }

# Map entitlements to the role
POST /roles/<role_uuid>/entitlements/<entitlement_uuid>
```

### Step 4 — Implement PKCE Auth in Your App

```javascript
// 1. Generate PKCE
const codeVerifier = randomBytes(64).toString('base64url');
const codeChallenge = base64url(sha256(codeVerifier));

// 2. Redirect user
const params = new URLSearchParams({
  response_type: 'code',
  client_id: 'gonok-web',
  redirect_uri: 'http://localhost:3333/auth/callback',
  scope: 'openid profile email entitlements',
  state: randomState,
  code_challenge: codeChallenge,
  code_challenge_method: 'S256',
});
window.location.href = `http://localhost:3400/oauth/authorize?${params}`;

// 3. On callback, exchange code for tokens
const tokens = await fetch('http://localhost:3400/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    grant_type: 'authorization_code',
    code: urlParams.get('code'),
    redirect_uri: 'http://localhost:3333/auth/callback',
    client_id: 'gonok-web',
    code_verifier: codeVerifier,
  }),
}).then(r => r.json());
```

### Step 5 — Validate Tokens and Use Entitlements

```javascript
import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS = createRemoteJWKSet(new URL('http://localhost:3400/oauth/jwks'));

export async function verifyToken(accessToken) {
  const { payload } = await jwtVerify(accessToken, JWKS, {
    issuer: 'http://localhost:3400',
    audience: 'gonok-web',
  });
  return payload;
}

// In middleware or route handler:
const { sub, entitlements } = await verifyToken(req.headers.authorization.split(' ')[1]);

if (!entitlements.includes('gonok:transactions:create')) {
  return res.status(403).json({ error: 'Forbidden' });
}
```

The `entitlements` array in the JWT contains every entitlement key the user holds for your app, derived from their active role assignments. No need to call Porichoy on every request.

---

## Manual Connector

Use this when you want governance (roles, reviews, audit) without automated provisioning.

Typical use cases:
- Legacy apps where you can't modify the login flow
- Apps that manage their own auth but should be subject to access reviews
- Internal tools where access is managed manually

**Setup:**
1. Register the application with `connectorType: "manual"`
2. Create roles and entitlements as above
3. Grant roles via `POST /assignments` — Porichoy records the grant but does not push anything to the app
4. Run access reviews against the application periodically

**Runtime authorization (optional):** If you want runtime policy evaluation without embedding entitlements in a JWT, call:

```http
POST /authz/evaluate
Authorization: Bearer <admin_token_or_service_account_token>

{
  "identityUuid": "<user_uuid>",
  "resource": "my-app:invoices",
  "action": "approve"
}
```

Response: `{ "allowed": true, "reasons": ["Policy: Finance Approval"] }`

---

## User Onboarding via API

### Option A — Direct Role Grant

Grant a specific role directly to an identity:

```http
POST /assignments
Authorization: Bearer <admin_token>

{
  "identityUuid": "<user_uuid>",
  "roleUuid": "<role_uuid>",
  "grantedReason": "Hired as Sales Manager",
  "expiresAt": null
}
```

Porichoy checks SoD policies before granting. If a conflict with `enforcement: prevent` exists, returns `409`. With `enforcement: warn`, grants and returns `sodWarning` in the response.

### Option B — Lifecycle Joiner Event

Trigger a joiner event and let rules determine role assignments:

```http
POST /lifecycle
Authorization: Bearer <admin_token>

{
  "identityUuid": "<user_uuid>",
  "eventType": "joiner",
  "source": "api",
  "payload": {
    "department": "Sales",
    "title": "Account Executive",
    "manager": "alice@gonok.com"
  }
}
```

The `payload` is stored on the lifecycle event for audit. Automated provisioning rules (future) will act on the event type and payload to assign appropriate roles.

### Leaver Flow

When a user leaves, revoke all active assignments and trigger a leaver event:

```http
# Revoke each active assignment
DELETE /assignments/<assignment_uuid>

# Record the event
POST /lifecycle
{
  "identityUuid": "<user_uuid>",
  "eventType": "leaver",
  "source": "api",
  "payload": { "reason": "Resignation", "lastDay": "2026-05-01" }
}

# Lock the identity to prevent login
POST /identities/<user_uuid>/lock
```

---

## Role → Entitlement Mapping Design Guide

Good entitlement design makes access reviews and SoD policies meaningful.

**Entitlement keys** follow the pattern `<app>:<resource>:<action>`:
```
gonok:transactions:read
gonok:transactions:create
gonok:transactions:approve
gonok:finance:read
gonok:finance:approve
gonok:inventory:read
gonok:inventory:write
gonok:reports:read
```

**Roles** bundle related entitlements:
```
Sales Manager     → transactions:read, transactions:create, transactions:approve
Finance Officer   → finance:read, finance:approve, transactions:read
Inventory Clerk   → inventory:read, inventory:write
Auditor           → transactions:read, finance:read, reports:read
```

**SoD rules** prevent toxic combinations:
```
Sales Manager ↔ Finance Officer  (prevent — segregate transaction creation from approval)
```

**Access reviews** periodically certify that assigned roles are still appropriate:
- Reviewer opens items, sees each identity + role pair
- Approves (keeps) or revokes (removes the assignment)
- Revoke decision automatically calls `DELETE /assignments/:uuid`

---

## connector_config Field

The `connectorConfig` JSONB field on an application is reserved for future API and SCIM connector implementations. For `oidc` and `manual` connectors, leave it as `{}`.

Future SCIM example:
```json
{
  "scimBaseUrl": "https://app.example.com/scim/v2",
  "bearerToken": "...",
  "syncEnabled": true,
  "syncIntervalMinutes": 60
}
```

Future API connector example:
```json
{
  "provisionUrl": "https://app.example.com/api/users",
  "deprovisionUrl": "https://app.example.com/api/users/{id}/deactivate",
  "apiKey": "..."
}
```
