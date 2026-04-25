# Quickstart — Connect Your App to Porichoy

This guide gets your app authenticating through Porichoy in under 10 minutes. By the end, your users will click "Sign in with Porichoy" and land back in your app with a JWT containing their roles and permissions.

A working reference app is included at `mock-apps/gonok-test-client/` — you can run it and study the code.

---

## Prerequisites

```bash
# Start Porichoy (Postgres + API + Frontend)
docker compose up -d
npx ts-node --project apps/api/tsconfig.app.json -r tsconfig-paths/register apps/api/src/main.ts
npx nx serve web
```

Porichoy API runs on `http://localhost:3400`, frontend on `http://localhost:3401`.

If this is a fresh install, seed the demo data first:

```bash
npx ts-node --project apps/api/tsconfig.app.json -r tsconfig-paths/register apps/api/src/seed.ts
```

---

## Step 1 — Register Your App in Porichoy

Login to the admin UI at `http://localhost:3401` as `admin@porichoy.com` / `admin123`.

Go to **Applications → + New Application** and fill in:

| Field | Example |
|-------|---------|
| Name | My App |
| Base URL | http://localhost:4000 |
| Type | web |
| Connector | oidc |

Or via API:

```bash
# Login as admin
curl -c cookies.txt -X POST http://localhost:3400/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@porichoy.com","password":"admin123"}'

# Register the app
curl -b cookies.txt -X POST http://localhost:3400/applications \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My App",
    "description": "My cool application",
    "appType": "web",
    "baseUrl": "http://localhost:4000",
    "connectorType": "oidc",
    "connectorConfig": {},
    "provisioningEnabled": false
  }'
```

Note the returned `uuid` — you'll need it next.

---

## Step 2 — Create an OAuth Client

Go to **Clients → + New Client** or use the API:

```bash
curl -b cookies.txt -X POST http://localhost:3400/clients \
  -H "Content-Type: application/json" \
  -d '{
    "clientName": "My App Web",
    "clientType": "public",
    "redirectUris": ["http://localhost:4000/auth/callback"],
    "allowedScopes": ["openid", "profile", "email", "entitlements"],
    "grantTypes": ["authorization_code", "refresh_token"],
    "applicationUuid": "YOUR_APP_UUID"
  }'
```

Note the returned `clientId` — this is what your app will use.

> **Public vs Confidential**: Use `public` for SPAs and mobile apps (PKCE only, no secret). Use `confidential` for server-side apps (get a `clientSecret` back, store it securely).

---

## Step 3 — Define Permissions

Create entitlements that model your app's permission system:

```bash
# Create entitlements
curl -b cookies.txt -X POST http://localhost:3400/roles/entitlements \
  -H "Content-Type: application/json" \
  -d '{"applicationUuid":"YOUR_APP_UUID","entitlementKey":"myapp:posts:read","displayName":"View Posts"}'

curl -b cookies.txt -X POST http://localhost:3400/roles/entitlements \
  -H "Content-Type: application/json" \
  -d '{"applicationUuid":"YOUR_APP_UUID","entitlementKey":"myapp:posts:write","displayName":"Create Posts"}'

curl -b cookies.txt -X POST http://localhost:3400/roles/entitlements \
  -H "Content-Type: application/json" \
  -d '{"applicationUuid":"YOUR_APP_UUID","entitlementKey":"myapp:admin:all","displayName":"Full Admin"}'
```

Create roles that bundle entitlements:

```bash
# Create a role
curl -b cookies.txt -X POST http://localhost:3400/roles \
  -H "Content-Type: application/json" \
  -d '{"applicationUuid":"YOUR_APP_UUID","name":"Editor","roleType":"business","isRequestable":true}'

# Map entitlements to the role
curl -b cookies.txt -X POST http://localhost:3400/roles/ROLE_UUID/entitlements/ENTITLEMENT_UUID
```

Assign roles to users:

```bash
curl -b cookies.txt -X POST http://localhost:3400/assignments \
  -H "Content-Type: application/json" \
  -d '{"identityUuid":"USER_UUID","roleUuid":"ROLE_UUID","grantedReason":"Onboarding"}'
```

---

## Step 4 — Add SSO to Your App

This is the plug-and-play part. Here's a minimal Node.js app that does the full PKCE flow:

```javascript
// server.js — minimal app with Porichoy SSO
const http = require('http');
const crypto = require('crypto');
const url = require('url');

// ── CONFIG: Change these to match your setup ──────────────────
const PORT = 4000;
const PORICHOY_UI = 'http://localhost:3401';       // Porichoy frontend (login/consent page)
const PORICHOY_API = 'http://localhost:3400';       // Porichoy API (token exchange)
const CLIENT_ID = 'your-client-id';                 // From step 2
const REDIRECT_URI = 'http://localhost:4000/auth/callback';
// ───────────────────────────────────────────────────────────────

let codeVerifier = null; // In production, use a session store

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);

  // ── Landing page ──
  if (parsed.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h1>My App</h1><a href="/auth/login">Sign in with Porichoy</a>');
    return;
  }

  // ── Step A: Start the PKCE flow ──
  if (parsed.pathname === '/auth/login') {
    // Generate PKCE pair
    codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    // Redirect user to Porichoy's login/consent page
    const authUrl = PORICHOY_UI + '/oauth/authorize'
      + '?client_id=' + CLIENT_ID
      + '&redirect_uri=' + encodeURIComponent(REDIRECT_URI)
      + '&response_type=code'
      + '&scope=' + encodeURIComponent('openid profile email entitlements')
      + '&code_challenge=' + codeChallenge
      + '&code_challenge_method=S256'
      + '&state=' + crypto.randomBytes(16).toString('hex');

    res.writeHead(302, { Location: authUrl });
    res.end();
    return;
  }

  // ── Step B: Handle the callback ──
  if (parsed.pathname === '/auth/callback') {
    const code = parsed.query.code;
    if (!code || !codeVerifier) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Missing code or session expired');
      return;
    }

    // Exchange auth code for JWT
    const tokenRes = await fetch(PORICHOY_API + '/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier,
        client_id: CLIENT_ID,
      }),
    });
    const tokens = await tokenRes.json();
    codeVerifier = null;

    if (tokens.error) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Token error: ' + tokens.error);
      return;
    }

    // Decode the JWT to get user info + entitlements
    const payload = JSON.parse(
      Buffer.from(tokens.access_token.split('.')[1], 'base64url').toString()
    );

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end([
      '<h1>Welcome, ' + payload.name + '!</h1>',
      '<p>Email: ' + payload.email + '</p>',
      '<p>Entitlements: ' + (payload.entitlements || []).join(', ') + '</p>',
      '<pre>' + JSON.stringify(payload, null, 2) + '</pre>',
    ].join(''));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => console.log('App running on http://localhost:' + PORT));
```

Run it:

```bash
node server.js
```

Open `http://localhost:4000`, click **"Sign in with Porichoy"**, and the flow runs:

```
Your App (localhost:4000)
    │
    ├─ /auth/login
    │   generates PKCE code_verifier + code_challenge
    │   redirects browser to ──────────────────────────────┐
    │                                                      │
    │                            Porichoy (localhost:3401)  │
    │                            /oauth/authorize           │
    │                                │                      │
    │                            user logs in               │
    │                            user grants consent        │
    │                                │                      │
    │   ◄── redirect with ?code=abc ─┘                      │
    │
    ├─ /auth/callback?code=abc
    │   POST /oauth/token with code + code_verifier
    │   ──► gets back JWT with entitlements
    │
    └─ Show dashboard with user info from JWT
```

---

## Step 5 — Use Entitlements in Your App

The JWT `entitlements` array tells you exactly what the user can do. Gate your features on it:

```javascript
// Middleware example
function requireEntitlement(key) {
  return (req, res, next) => {
    if (!req.user || !req.user.entitlements.includes(key)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

// Usage
app.post('/api/posts', requireEntitlement('myapp:posts:write'), (req, res) => {
  // User has permission — create the post
});

app.get('/api/admin', requireEntitlement('myapp:admin:all'), (req, res) => {
  // Admin-only endpoint
});
```

---

## Step 6 — Validate JWTs Properly (Production)

For production, don't just decode the JWT — verify the signature using Porichoy's public key:

```javascript
const { createRemoteJWKSet, jwtVerify } = require('jose');

const JWKS = createRemoteJWKSet(
  new URL('http://localhost:3400/oauth/jwks')
);

async function verifyToken(accessToken) {
  const { payload } = await jwtVerify(accessToken, JWKS, {
    issuer: 'http://localhost:3400',
    audience: 'your-client-id',  // must match your client_id
  });
  return payload;
  // payload.sub          → user UUID
  // payload.name         → display name
  // payload.email        → email
  // payload.entitlements → ['myapp:posts:read', 'myapp:posts:write', ...]
  // payload.is_admin     → boolean
}
```

---

## Complete Checklist

| # | What | Where | Done? |
|---|------|-------|-------|
| 1 | Register application | Porichoy Admin → Applications | |
| 2 | Create OAuth client | Porichoy Admin → Clients | |
| 3 | Create entitlements | Porichoy Admin → Roles → Entitlements | |
| 4 | Create roles + map entitlements | Porichoy Admin → Roles | |
| 5 | Assign roles to users | Porichoy Admin → Assignments | |
| 6 | Add `/auth/login` route to your app | Your app code | |
| 7 | Add `/auth/callback` route to your app | Your app code | |
| 8 | Gate features on `entitlements[]` | Your app code | |
| 9 | (Production) Verify JWT via JWKS | Your app code | |

---

## Reference App

A fully working test client is at `mock-apps/gonok-test-client/server.js`. It demonstrates:

- PKCE code generation
- Redirect to Porichoy's login/consent page
- Auth code → token exchange
- JWT decoding and entitlement display
- A full dashboard gated by permissions

Run it:

```bash
node mock-apps/gonok-test-client/server.js
# Open http://localhost:3333
```

Test accounts:

| User | Password | Roles (Gonok) | Entitlements |
|------|----------|---------------|--------------|
| alice@gonok.com | alice123 | Sales Manager, Inventory Clerk | transactions:read/create/approve, inventory:read/write |
| bob@gonok.com | bob123 | Finance Officer, Auditor | finance:read/approve, transactions:read, inventory:read, reports:read |
| admin@porichoy.com | admin123 | (none for Gonok) | (empty — no Gonok roles) |

OTP (if prompted): `123456` (dev mode).

---

## Entitlement Key Design

Follow the pattern `<app>:<resource>:<action>`:

```
myapp:posts:read
myapp:posts:write
myapp:posts:delete
myapp:users:manage
myapp:billing:view
myapp:admin:all
```

Bundle into roles:

```
Viewer    → posts:read
Editor    → posts:read, posts:write
Admin     → posts:read, posts:write, posts:delete, users:manage, admin:all
```

Keep entitlements granular and roles coarse — this makes access reviews and SoD policies meaningful.

---

## Token Refresh

Access tokens expire after 1 hour (configurable via `ACCESS_TOKEN_TTL_SECONDS`). Refresh silently:

```javascript
async function refreshTokens(refreshToken) {
  const res = await fetch('http://localhost:3400/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: 'your-client-id',
    }),
  });
  return res.json();
  // Returns new access_token + new refresh_token (rotation)
}
```

---

## User Identity Mapping

Your app's users and Porichoy's identities are separate records. Link them using the JWT `sub` claim (the user's Porichoy UUID):

```sql
-- Your app's users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT,
  email TEXT,
  porichoy_uuid UUID UNIQUE,  -- links to Porichoy identity
  created_at TIMESTAMP DEFAULT NOW()
);
```

On first login via SSO, create a local user record with the `sub` from the JWT:

```javascript
// In your /auth/callback handler, after getting the JWT:
const payload = decodeJwt(tokens.access_token);

let user = await db.query('SELECT * FROM users WHERE porichoy_uuid = $1', [payload.sub]);
if (!user) {
  user = await db.query(
    'INSERT INTO users (name, email, porichoy_uuid) VALUES ($1, $2, $3) RETURNING *',
    [payload.name, payload.email, payload.sub]
  );
}
// Now you have a local user linked to their Porichoy identity
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `invalid_client` | Check `client_id` matches exactly what Porichoy returned |
| `invalid_redirect_uri` | The `redirect_uri` must exactly match one in the client's `redirectUris` array |
| `invalid_code_verifier` | PKCE mismatch — make sure you're SHA-256 hashing the verifier and using base64url (not base64) |
| Empty entitlements in JWT | User has no roles assigned for this app. Check Assignments in admin UI |
| `token_expired` | Access token expired. Use the refresh token to get a new one |
| Consent screen shows every time | Check that consent is being saved — the `/oauth/authorize/consent` endpoint must be called successfully |
