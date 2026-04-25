# Auth Flow

## Overview

Porichoy implements **OAuth 2.0 Authorization Code flow with PKCE** (Proof Key for Code Exchange) as specified in RFC 7636. All tokens are signed with **RS256** (RSA + SHA-256), and the public key is available via JWKS so connected apps can validate tokens independently.

```
Your App                Porichoy Frontend           Porichoy API
(localhost:4000)        (localhost:3401)             (localhost:3400)
       │                      │                           │
       │─ 1. Redirect ───────▶│                           │
       │   /oauth/authorize    │                           │
       │   + PKCE params      │                           │
       │                      │── user logs in ──────────▶│
       │                      │   (gets session cookie)   │
       │                      │                           │
       │                      │── consent approved ──────▶│
       │                      │   POST /oauth/consent     │
       │                      │                           │
       │◄─ 2. Redirect ───────│◄── auth code ────────────│
       │   ?code=abc&state=x  │                           │
       │                      │                           │
       │──────── 3. POST /oauth/token ───────────────────▶│
       │         (code + code_verifier)                   │
       │◄─────── 4. JWT + refresh token ─────────────────│
       │                                                  │
       │─── 5. App gates features on JWT entitlements ────│
       │        (validates signature via GET /oauth/jwks) │
```

---

## Step-by-Step Flow

### Step 1 — Generate PKCE Parameters (Client-Side)

Before redirecting the user, the client generates a `code_verifier` and derives the `code_challenge`:

```javascript
// Generate a 43-128 character random string
const codeVerifier = generateRandomString(64);

// SHA-256 hash → Base64url encode
const codeChallenge = base64url(sha256(codeVerifier));
```

Store `codeVerifier` in session storage (never sent to the server until step 3).

---

### Step 2 — Redirect to Authorization Endpoint

Redirect the user to Porichoy's **frontend** (not the API). The frontend provides a branded login + consent page:

```
GET http://localhost:3401/oauth/authorize
  ?response_type=code
  &client_id=gonok-web
  &redirect_uri=http://localhost:3333/auth/callback
  &scope=openid profile email entitlements
  &state=<random_csrf_token>
  &code_challenge=<base64url_sha256_of_verifier>
  &code_challenge_method=S256
```

> **Important**: Redirect to the frontend (`localhost:3401`), not the API (`localhost:3400`). The frontend handles the login form, consent screen, and then calls the API on the user's behalf.

**What happens:**
1. If the user isn't logged in, they see a login form (password or OTP)
2. After login, Porichoy shows a consent screen with the app name and requested scopes
3. If the user has previously consented, consent is skipped automatically
4. On approval, the backend generates an authorization code
5. The user is redirected back to: `http://localhost:3333/auth/callback?code=<auth_code>&state=<state>`

---

### Step 3 — Login (if not already authenticated)

If the user isn't logged in, they go through:

```http
POST /auth/login
Content-Type: application/json

{ "email": "alice@gonok.com", "password": "alice123" }
```

Response sets a `porichoy_session` httpOnly cookie.

In production with MFA enabled:

```http
POST /auth/otp/request
{ "email": "alice@gonok.com" }

POST /auth/otp/verify
{ "email": "alice@gonok.com", "otp": "123456" }
```

---

### Step 4 — Consent Screen

On first authorization, the user is presented with a consent prompt listing the requested scopes. The app submits:

```http
POST /oauth/authorize/consent
Authorization: Cookie porichoy_session=...
Content-Type: application/json

{
  "clientId": "gonok-web",
  "scopes": ["openid", "profile", "email", "entitlements"],
  "approved": true
}
```

Response returns the redirect URI with the authorization code.

Subsequent authorizations skip consent if the user already approved the same scopes.

---

### Step 5 — Token Exchange

The app backend (or SPA) exchanges the code for tokens:

```http
POST /oauth/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "<auth_code>",
  "redirect_uri": "http://localhost:3333/auth/callback",
  "client_id": "gonok-web",
  "code_verifier": "<original_code_verifier>"
}
```

**Response**
```json
{
  "access_token": "<jwt>",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "<opaque_token>",
  "id_token": "<jwt>",
  "scope": "openid profile email entitlements"
}
```

Porichoy validates:
- Code exists, hasn't been used, hasn't expired
- `redirect_uri` matches what was used in step 2
- `code_verifier` → SHA-256 → matches stored `code_challenge`
- Then marks the code as used (single-use)

---

### Step 6 — Token Structure

**Access Token** (JWT, RS256)

```json
{
  "iss": "http://localhost:3400",
  "sub": "<identity_uuid>",
  "aud": "gonok-web",
  "iat": 1745000000,
  "exp": 1745003600,
  "jti": "<unique_token_id>",
  "scope": "openid profile email entitlements",
  "entitlements": [
    "gonok:transactions:read",
    "gonok:transactions:create",
    "gonok:transactions:approve",
    "gonok:inventory:read"
  ]
}
```

The `entitlements` claim is the **Token Bridge** — at issuance, Porichoy queries the SailPoint side to find all active role assignments for this identity scoped to the requesting application, then embeds all mapped entitlement keys into the token. Connected apps can gate features directly from this claim without calling `/authz/evaluate` on every request.

**ID Token** (JWT, RS256)

```json
{
  "iss": "http://localhost:3400",
  "sub": "<identity_uuid>",
  "aud": "gonok-web",
  "iat": 1745000000,
  "exp": 1745003600,
  "name": "Alice Smith",
  "email": "alice@gonok.com",
  "email_verified": true
}
```

---

### Step 7 — Validate Tokens in Connected Apps

Apps can validate tokens in two ways:

**Option A — Local validation via JWKS (recommended)**

```javascript
import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS = createRemoteJWKSet(new URL('http://localhost:3400/oauth/jwks'));

const { payload } = await jwtVerify(accessToken, JWKS, {
  issuer: 'http://localhost:3400',
  audience: 'gonok-web',
});

// payload.entitlements → ['gonok:transactions:read', ...]
```

**Option B — UserInfo endpoint**

```http
GET /oauth/userinfo
Authorization: Bearer <access_token>
```

Returns the same claims as the access token plus profile info.

---

### Step 8 — Token Refresh

Access tokens expire after `ACCESS_TOKEN_TTL_SECONDS` (default: 3600). Refresh using:

```http
POST /oauth/token
Content-Type: application/json

{
  "grant_type": "refresh_token",
  "refresh_token": "<refresh_token>",
  "client_id": "gonok-web"
}
```

**Response** — New access token + new refresh token (rotation).

The old refresh token is immediately revoked. If a revoked token is presented again, the entire token family is revoked (detect token theft).

---

## Session vs Bearer Auth

Porichoy uses two parallel authentication mechanisms:

| | Session Cookie | Bearer Token |
|--|----------------|--------------|
| **Used by** | Admin web UI (`localhost:3401`) | Connected apps, API clients |
| **How set** | `POST /auth/login` sets `porichoy_session` httpOnly cookie | App stores `access_token` from `/oauth/token` |
| **How sent** | Automatically by browser | `Authorization: Bearer <token>` header |
| **Lifetime** | `SESSION_TTL_DAYS` (default: 7 days) | `ACCESS_TOKEN_TTL_SECONDS` (default: 1 hour) |
| **Revocation** | `DELETE /sessions/:uuid` | Token tracked in DB via `jti`; revocable |

The auth middleware accepts **either** method — it checks for the session cookie first, then falls back to the Bearer header.

---

## Security Notes

- **PKCE is required** for all public clients (SPAs, mobile apps). Confidential clients (server-side) may use `client_secret_basic` instead.
- **Authorization codes** are single-use and expire in 10 minutes.
- **Refresh tokens** are stored as bcrypt hashes — the plaintext is only returned once.
- **Refresh token rotation** — each use issues a new token and revokes the old one.
- **Token revocation** — access tokens are tracked by `jti` in the `access_tokens` table; revocation is checked on Bearer auth.
- **RS256 over HS256** — connected apps validate tokens using Porichoy's public JWKS without needing a shared secret.
- **RSA keys** persist in `.keys/` across restarts. Delete and restart to rotate keys (existing tokens become invalid).
