# API Reference

## Base URL

```
http://localhost:3400
```

## Authentication

Most endpoints require authentication. Two methods are accepted:

| Method | How to send | Used by |
|--------|-------------|---------|
| Session cookie | Automatically via browser (`porichoy_session` httpOnly cookie) | Admin web UI |
| Bearer token | `Authorization: Bearer <access_token>` header | API clients, connected apps |

Endpoints marked **Admin only** additionally require `isAdmin: true` on the identity.

---

## Health

### `GET /health`

No auth required.

**Response**
```json
{ "status": "ok", "timestamp": "2026-04-22T10:00:00.000Z" }
```

---

## Ping Side (IAM)

### Auth — `/auth`

#### `POST /auth/register`

Create a new identity with a password credential.

**Body**
```json
{
  "displayName": "Alice Smith",
  "email": "alice@example.com",
  "password": "secret123",
  "phone": "+8801700000001"
}
```

**Response** `201`
```json
{
  "uuid": "...",
  "displayName": "Alice Smith",
  "email": "alice@example.com",
  "status": "active",
  "identityType": "person",
  "isAdmin": false
}
```

---

#### `POST /auth/login`

Login with email + password. Returns a session cookie.

**Body**
```json
{ "email": "alice@example.com", "password": "secret123" }
```

**Response** `200`
```json
{
  "uuid": "...",
  "displayName": "Alice Smith",
  "email": "alice@example.com",
  "isAdmin": false
}
```

Sets `porichoy_session` httpOnly cookie.

---

#### `POST /auth/otp/request`

Send an OTP to the identity's registered phone or email.

**Body**
```json
{ "email": "alice@example.com" }
```

**Response** `200`
```json
{ "message": "OTP sent" }
```

> In dev mode (`OTP_DEV_MODE=true`) the OTP is always `123456`.

---

#### `POST /auth/otp/verify`

Verify an OTP and upgrade the session.

**Body**
```json
{ "email": "alice@example.com", "otp": "123456" }
```

**Response** `200`
```json
{ "message": "OTP verified" }
```

---

#### `POST /auth/logout`

Requires auth. Destroys the current session and clears the cookie.

**Response** `200`
```json
{ "message": "Logged out" }
```

---

#### `GET /auth/me`

Requires auth. Returns the authenticated identity.

**Response** `200`
```json
{
  "uuid": "...",
  "displayName": "Alice Smith",
  "email": "alice@example.com",
  "status": "active",
  "isAdmin": false,
  "identityType": "person"
}
```

---

### OAuth / OIDC — `/oauth`

#### `GET /oauth/authorize`

Requires auth (redirects to login if not authenticated).

Initiates the OAuth authorization code flow.

**Query params**

| Param | Required | Description |
|-------|----------|-------------|
| `response_type` | Yes | Must be `code` |
| `client_id` | Yes | Registered OAuth client ID |
| `redirect_uri` | Yes | Must match a registered redirect URI |
| `scope` | Yes | Space-separated: `openid profile email entitlements` |
| `state` | Recommended | CSRF protection value |
| `code_challenge` | Yes (public clients) | Base64url SHA-256 of `code_verifier` |
| `code_challenge_method` | Yes (public clients) | Must be `S256` |

**Response** — Redirects to `redirect_uri?code=<auth_code>&state=<state>`

---

#### `POST /oauth/authorize/consent`

Requires auth. Submit the user's consent decision for the OAuth authorization prompt.

**Body**
```json
{
  "clientId": "gonok-web",
  "scopes": ["openid", "profile", "entitlements"],
  "approved": true
}
```

**Response** `200`
```json
{ "redirectUri": "http://localhost:3333/auth/callback?code=...&state=..." }
```

---

#### `POST /oauth/token`

Exchange an authorization code for tokens, or refresh an access token.

**Authorization code exchange**
```json
{
  "grant_type": "authorization_code",
  "code": "<auth_code>",
  "redirect_uri": "http://localhost:3333/auth/callback",
  "client_id": "gonok-web",
  "code_verifier": "<original_code_verifier>"
}
```

**Refresh token**
```json
{
  "grant_type": "refresh_token",
  "refresh_token": "<refresh_token>",
  "client_id": "gonok-web"
}
```

**Response** `200`
```json
{
  "access_token": "<jwt>",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "<opaque_token>",
  "id_token": "<jwt>",
  "scope": "openid profile entitlements"
}
```

The `access_token` contains an `entitlements` claim — see [Auth Flow](AUTH_FLOW.md) for the JWT structure.

---

#### `GET /oauth/userinfo`

Requires auth (Bearer token).

**Response** `200`
```json
{
  "sub": "<identity_uuid>",
  "name": "Alice Smith",
  "email": "alice@example.com",
  "email_verified": true,
  "entitlements": ["gonok:transactions:read", "gonok:transactions:create"]
}
```

---

#### `GET /oauth/jwks`

No auth required. Returns the public JWKS used to verify JWT signatures.

**Response** `200`
```json
{
  "keys": [{
    "kty": "RSA",
    "use": "sig",
    "alg": "RS256",
    "kid": "porichoy-1",
    "n": "...",
    "e": "AQAB"
  }]
}
```

---

#### `GET /.well-known/openid-configuration`

No auth required. OIDC discovery document.

**Response** `200`
```json
{
  "issuer": "http://localhost:3400",
  "authorization_endpoint": "http://localhost:3400/oauth/authorize",
  "token_endpoint": "http://localhost:3400/oauth/token",
  "userinfo_endpoint": "http://localhost:3400/oauth/userinfo",
  "jwks_uri": "http://localhost:3400/oauth/jwks",
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "subject_types_supported": ["public"],
  "id_token_signing_alg_values_supported": ["RS256"],
  "scopes_supported": ["openid", "profile", "email", "entitlements"],
  "code_challenge_methods_supported": ["S256"]
}
```

---

### Authorization — `/authz`

#### `POST /authz/evaluate`

Requires auth. Evaluate an authorization policy for a given identity + resource + action.

**Body**
```json
{
  "identityUuid": "<uuid>",
  "resource": "gonok:transactions",
  "action": "create"
}
```

**Response** `200`
```json
{ "allowed": true, "reasons": ["Policy: Allow Transaction Creation"] }
```

or

```json
{ "allowed": false, "reasons": ["No matching policy"] }
```

---

#### `GET /authz/policies`

Admin only. List all authorization policies.

**Response** `200` — array of policy objects.

---

#### `POST /authz/policies`

Admin only. Create a policy.

**Body**
```json
{
  "name": "Allow Transaction Creation",
  "description": "Sales Managers can create transactions",
  "policyType": "rbac",
  "resource": "gonok:transactions",
  "action": "create",
  "effect": "allow",
  "priority": 10
}
```

**Response** `201` — created policy object.

---

#### `PATCH /authz/policies/:uuid`

Admin only. Update a policy.

**Body** — any subset of policy fields.

**Response** `200` — updated policy object.

---

#### `DELETE /authz/policies/:uuid`

Admin only. Delete a policy.

**Response** `204`

---

#### `POST /authz/policies/:policyUuid/roles/:roleUuid`

Admin only. Bind a role to a policy (role satisfies the policy).

**Response** `201`

---

#### `DELETE /authz/policies/:policyUuid/roles/:roleUuid`

Admin only. Remove a role-policy binding.

**Response** `204`

---

### Sessions — `/sessions`

#### `GET /sessions`

Requires auth. List all active sessions for the authenticated identity.

**Response** `200`
```json
[{
  "uuid": "...",
  "ipAddress": "127.0.0.1",
  "userAgent": "Mozilla/5.0 ...",
  "lastActiveAt": "2026-04-22T09:00:00.000Z",
  "expiresAt": "2026-04-29T09:00:00.000Z",
  "isActive": true
}]
```

---

#### `DELETE /sessions/:uuid`

Requires auth. Revoke a specific session.

**Response** `200`
```json
{ "message": "Session revoked" }
```

---

#### `DELETE /sessions`

Requires auth. Revoke all sessions for the authenticated identity.

**Response** `200`
```json
{ "message": "All sessions revoked" }
```

---

### OAuth Clients — `/clients`

All endpoints are admin only.

#### `GET /clients`

List all OAuth clients.

**Response** `200` — array of client objects (secret not returned).

---

#### `GET /clients/:uuid`

Get a specific OAuth client.

**Response** `200` — client object.

---

#### `POST /clients`

Create a new OAuth client.

**Body**
```json
{
  "clientName": "My App",
  "clientType": "public",
  "redirectUris": ["http://localhost:3333/auth/callback"],
  "allowedScopes": ["openid", "profile", "entitlements"],
  "grantTypes": ["authorization_code", "refresh_token"],
  "applicationUuid": "<app-uuid-or-null>"
}
```

**Response** `201`
```json
{
  "uuid": "...",
  "clientId": "my-app",
  "clientSecret": "<only returned on creation for confidential clients>",
  "clientType": "public",
  ...
}
```

---

#### `PATCH /clients/:uuid`

Update a client.

**Response** `200` — updated client object.

---

#### `DELETE /clients/:uuid`

Delete a client.

**Response** `204`

---

#### `POST /clients/:uuid/rotate-secret`

Rotate the client secret for a confidential client.

**Response** `200`
```json
{ "clientSecret": "<new_secret>" }
```

---

## SailPoint Side (IGA)

### Applications — `/applications`

All endpoints are admin only.

#### `GET /applications`

List all applications.

**Response** `200`
```json
[{
  "uuid": "...",
  "name": "Gonok",
  "description": "Small business ERP",
  "appType": "web",
  "connectorType": "oidc",
  "status": "active"
}]
```

---

#### `GET /applications/:uuid`

Get a specific application.

---

#### `POST /applications`

Create a new application.

**Body**
```json
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

**Response** `201` — created application object.

---

#### `PATCH /applications/:uuid`

Update an application.

---

#### `DELETE /applications/:uuid`

Delete an application.

**Response** `204`

---

### Roles & Entitlements — `/roles`

All endpoints are admin only.

#### `GET /roles`

List roles. Optionally filter by application.

**Query params**

| Param | Description |
|-------|-------------|
| `applicationUuid` | Filter by application UUID |

---

#### `GET /roles/:uuid`

Get a specific role.

---

#### `POST /roles`

Create a role.

**Body**
```json
{
  "applicationUuid": "<app-uuid>",
  "name": "Sales Manager",
  "description": "Can create and approve transactions",
  "roleType": "business",
  "isRequestable": true,
  "maxDurationDays": 365
}
```

---

#### `PATCH /roles/:uuid`

Update a role.

---

#### `DELETE /roles/:uuid`

Delete a role.

**Response** `204`

---

#### `GET /roles/:uuid/entitlements`

List entitlements assigned to a role.

---

#### `POST /roles/:uuid/entitlements/:entitlementUuid`

Add an entitlement to a role.

**Response** `201`

---

#### `DELETE /roles/:uuid/entitlements/:entitlementUuid`

Remove an entitlement from a role.

**Response** `204`

---

#### `GET /roles/entitlements`

List entitlements. Optionally filter by application.

**Query params**

| Param | Description |
|-------|-------------|
| `applicationUuid` | Filter by application |

---

#### `POST /roles/entitlements`

Create an entitlement.

**Body**
```json
{
  "applicationUuid": "<app-uuid>",
  "entitlementKey": "gonok:transactions:create",
  "displayName": "Create Transactions",
  "description": "Allows creating new transactions in Gonok"
}
```

---

#### `DELETE /roles/entitlements/:uuid`

Delete an entitlement.

**Response** `204`

---

### Assignments — `/assignments`

All endpoints are admin only.

#### `GET /assignments/identities/:identityUuid`

List all role assignments for an identity.

**Response** `200`
```json
[{
  "uuid": "...",
  "role": { "uuid": "...", "name": "Sales Manager", "application": { "name": "Gonok" } },
  "status": "active",
  "grantedBy": "admin@porichoy.com",
  "grantedReason": "Onboarding",
  "expiresAt": null
}]
```

---

#### `POST /assignments`

Grant a role to an identity.

**Body**
```json
{
  "identityUuid": "<uuid>",
  "roleUuid": "<uuid>",
  "grantedReason": "Onboarding",
  "expiresAt": "2027-01-01T00:00:00.000Z"
}
```

**Response** `201`

If a SoD conflict is detected with `enforcement: warn`, the response includes:
```json
{ "sodWarning": "Conflicts with Finance Officer (SoD: Sales Manager ↔ Finance Officer)" }
```

If `enforcement: prevent`, returns `409 Conflict`.

---

#### `DELETE /assignments/:uuid`

Revoke a role assignment.

**Response** `204`

---

#### `POST /assignments/check-sod`

Check for SoD violations without granting.

**Body**
```json
{ "identityUuid": "<uuid>", "roleUuid": "<uuid>" }
```

**Response** `200`
```json
{ "violations": [], "hasConflict": false }
```

---

#### `GET /assignments/sod-policies`

List SoD policies.

---

#### `POST /assignments/sod-policies`

Create a SoD policy.

**Body**
```json
{
  "name": "Sales vs Finance",
  "description": "Sales Manager and Finance Officer are incompatible",
  "conflictingRoleAUuid": "<role-a-uuid>",
  "conflictingRoleBUuid": "<role-b-uuid>",
  "enforcement": "prevent"
}
```

---

#### `PATCH /assignments/sod-policies/:uuid`

Update a SoD policy.

---

#### `DELETE /assignments/sod-policies/:uuid`

Delete a SoD policy.

**Response** `204`

---

### Access Reviews — `/reviews`

All endpoints are admin only.

#### `GET /reviews`

List all review campaigns.

---

#### `GET /reviews/:uuid`

Get a specific review.

---

#### `POST /reviews`

Create a new review campaign.

**Body**
```json
{
  "name": "Q2 2026 Gonok Access Review",
  "description": "Quarterly certification for Gonok app roles",
  "reviewerUuid": "<identity-uuid>",
  "dueDate": "2026-06-30",
  "applicationUuid": "<app-uuid-or-null>"
}
```

When `applicationUuid` is provided, review items are auto-generated for all active identity-role assignments in that application.

**Response** `201` — review object with generated items.

---

#### `GET /reviews/:uuid/items`

List items within a review campaign.

**Response** `200`
```json
[{
  "uuid": "...",
  "identity": { "uuid": "...", "displayName": "Alice Smith" },
  "role": { "uuid": "...", "name": "Sales Manager" },
  "decision": "pending",
  "decidedBy": null,
  "decidedAt": null,
  "comments": ""
}]
```

---

#### `PATCH /reviews/items/:itemUuid/decide`

Submit a certification decision on a review item.

**Body**
```json
{ "decision": "approve", "comments": "Access still needed" }
```

`decision` values: `approve` | `revoke`

**Response** `200` — updated item.

If `revoke`, the corresponding identity-role assignment is automatically revoked.

---

#### `POST /reviews/:uuid/complete`

Mark a review as completed.

**Response** `200`

---

#### `POST /reviews/:uuid/cancel`

Cancel a review.

**Response** `200`

---

### Lifecycle — `/lifecycle`

All endpoints are admin only.

#### `GET /lifecycle`

List lifecycle events.

**Query params**

| Param | Description |
|-------|-------------|
| `identityUuid` | Filter by identity |

---

#### `GET /lifecycle/:uuid`

Get a specific lifecycle event.

---

#### `POST /lifecycle`

Trigger a lifecycle event.

**Body**
```json
{
  "identityUuid": "<uuid>",
  "eventType": "joiner",
  "source": "manual",
  "payload": {
    "department": "Sales",
    "title": "Account Executive"
  }
}
```

`eventType` values: `joiner` | `mover` | `leaver`

**Response** `201` — lifecycle event object.

---

## Shared

### Audit Logs — `/audit`

Admin only.

#### `GET /audit`

Query the audit log.

**Query params**

| Param | Description |
|-------|-------------|
| `actorUuid` | Filter by actor identity |
| `action` | Filter by action string (e.g., `role.grant`) |
| `resourceType` | Filter by resource type (e.g., `identity`, `role`) |
| `resourceUuid` | Filter by specific resource |
| `from` | ISO timestamp — earliest entry |
| `to` | ISO timestamp — latest entry |
| `limit` | Max results (default 50) |
| `offset` | Pagination offset |

**Response** `200`
```json
[{
  "uuid": "...",
  "actorUuid": "<uuid>",
  "action": "role.grant",
  "resourceType": "identity_role",
  "resourceUuid": "<uuid>",
  "details": { "roleUuid": "...", "identityUuid": "..." },
  "ipAddress": "127.0.0.1",
  "timestamp": "2026-04-22T09:00:00.000Z"
}]
```

---

### Identities — `/identities`

Admin only.

#### `GET /identities`

List identities.

**Query params**

| Param | Description |
|-------|-------------|
| `status` | `active` \| `inactive` \| `locked` \| `pending` |
| `search` | Search by name or email |
| `limit` | Default 50 |
| `offset` | Pagination offset |

---

#### `GET /identities/:uuid`

Get a specific identity.

---

#### `PATCH /identities/:uuid`

Update an identity (display name, status, metadata).

**Body**
```json
{
  "displayName": "Alice Smith-Jones",
  "metadata": { "department": "Sales" }
}
```

---

#### `POST /identities/:uuid/lock`

Lock an identity (prevents login).

**Response** `200`

---

#### `POST /identities/:uuid/unlock`

Unlock a locked identity.

**Response** `200`

---

## Error Responses

All errors follow this shape:

```json
{ "error": "Human-readable error message" }
```

| Status | Meaning |
|--------|---------|
| 400 | Bad request / validation failure |
| 401 | Not authenticated |
| 403 | Authenticated but not authorized (not admin) |
| 404 | Resource not found |
| 409 | Conflict (e.g., SoD prevent violation, duplicate) |
| 500 | Internal server error |
