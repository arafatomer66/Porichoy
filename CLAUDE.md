# Porichoy — Claude Context

## What This Project Is

Porichoy (পরিচয়) is a self-hosted **IAM + Identity Governance (IGA)** platform for small businesses. It combines two logical subsystems in one Express backend + one Angular frontend:

- **Ping side (IAM)** — authentication, OAuth2/OIDC provider, MFA/OTP, session management, authorization policy evaluation
- **SailPoint side (IGA)** — application onboarding, role/entitlement management, access reviews, SoD policies, lifecycle events (Joiner/Mover/Leaver), audit trail

They share one PostgreSQL database and one **Identity Core** (`identities` + `credentials` tables).

---

## Stack

| Layer | Tech |
|-------|------|
| Backend | Node.js 20, Express, TypeORM, PostgreSQL 16 |
| Frontend | Angular 19, @ngrx/signals, standalone components |
| Monorepo | Nx 20.3 |
| Token signing | RS256 via `jose` library (keys persisted in `.keys/`) |
| Auth protocol | OAuth2 / OIDC with PKCE (S256) |
| ORM entities | 20 TypeORM entity classes in `apps/api/src/entities/` |

---

## Running the Project

```bash
# 1. Start postgres (maps to port 5433 — NOT 5432, avoids local PG conflicts)
docker compose up -d

# 2. Install deps
npm install

# 3. Seed demo data (first time only)
npx ts-node --project apps/api/tsconfig.app.json -r tsconfig-paths/register apps/api/src/seed.ts

# 4. Start API (port 3400)
npx nx serve api

# 5. Start frontend (port 3401)
npx nx serve web
```

**.env** lives at repo root. Key vars: `DB_PORT=5433`, `PORT=3400`, `OTP_DEV_MODE=true`, `OTP_DEV_VALUE=123456`.

---

## Demo Accounts (seeded)

| Email | Password | Notes |
|-------|----------|-------|
| admin@porichoy.com | admin123 | isAdmin=true, full access |
| alice@gonok.com | alice123 | Sales Manager + Inventory Clerk |
| bob@gonok.com | bob123 | Finance Officer + Auditor |

Dev OTP is always `123456`.

---

## Project Structure

```
apps/
  api/src/
    main.ts                    # Bootstrap: initKeys → DB connect → Express listen
    app/app.ts                 # Route registration, middleware stack
    config/
      keys.ts                  # RSA key pair (jose exportPKCS8/exportSPKI — NOT Web Crypto)
      database.ts              # TypeORM AppDataSource
      env.ts                   # Env var parsing
    entities/                  # 20 TypeORM entities
    middleware/
      auth.middleware.ts        # JWT/session extraction → req.identity
      admin.middleware.ts       # requireAdmin check
      audit.middleware.ts       # Request logging
      error.middleware.ts       # Global error handler
    modules/
      ping/
        auth/                  # POST /auth/register|login|otp/request|otp/verify|logout, GET /auth/me
        oauth/                 # GET /oauth/authorize, POST /oauth/token, GET /oauth/jwks, OIDC discovery
        authz/                 # POST /authz/evaluate, CRUD /authz/policies
        sessions/              # GET|DELETE /sessions
        clients/               # CRUD /clients, POST /clients/:uuid/rotate-secret
      sailpoint/
        applications/          # CRUD /applications
        roles/                 # CRUD /roles, entitlement mapping
        assignments/           # /assignments + SoD policies
        reviews/               # Access review campaigns + item decisions
        lifecycle/             # Joiner/Mover/Leaver events
      audit/                   # GET /audit (append-only, never deleted)
      admin/identities/        # CRUD /identities, lock/unlock
    seed.ts                    # One-time demo data seeder
web/src/app/
  core/
    services/api.service.ts    # HttpClient wrapper, BASE_URL=localhost:3400
    stores/auth.store.ts       # @ngrx/signals auth store (login/logout/loadMe)
    guards/auth.guard.ts       # authGuard, adminGuard, guestGuard
  features/
    auth/                      # Login, register pages
    admin/                     # Shell + 10 admin panels (dashboard, identities, roles, etc.)
```

---

## Key Architecture Concepts

### Token Bridge
At JWT issuance (`POST /oauth/token`), Ping queries SailPoint tables to embed the user's active entitlements into the access token:
```
identity_roles → roles → role_entitlements → entitlements → JWT.entitlements[]
```
Connected apps read `entitlements` from the JWT directly — no runtime call to `/authz/evaluate` needed.

### Dual Auth
The middleware accepts **either** a session cookie (`porichoy_session`) OR a `Bearer` token. Cookie = browser/admin UI. Bearer = API clients/connected apps.

### SoD (Separation of Duties)
On `POST /assignments`, the service checks `sod_policies` for conflicting role pairs. `enforcement: prevent` → 409 error. `enforcement: warn` → grants + returns `sodWarning` in response.

### RSA Keys
Keys are generated on first API startup and persisted to `.keys/private.pem` + `.keys/public.pem`. Uses `jose`'s `exportPKCS8`/`exportSPKI` — **never** `globalThis.crypto.subtle` (unavailable in ts-node).

---

## App Onboarding Pattern

When connecting a new app to Porichoy:

1. `POST /applications` → get `APP_UUID`
2. `POST /roles/entitlements` × N → create permission keys (e.g. `myapp:invoices:read`)
3. `POST /roles` → create roles (bundles of entitlements)
4. `POST /roles/:uuid/entitlements/:uuid` → map entitlements to roles
5. `POST /clients` with `applicationUuid` → get `clientId` for OIDC
6. `POST /assignments` → grant roles to users
7. App implements PKCE auth code flow → gets JWT with `entitlements` claim
8. App validates JWT via `GET /oauth/jwks` and gates features on entitlement keys

**User identity mapping**: Users exist in BOTH Porichoy (`identities` table) AND the connected app's own DB. The app stores `porichoy_uuid` (= JWT `sub`) as a foreign key to link its local user record to the Porichoy identity.

---

## Documentation

| File | Contents |
|------|----------|
| `docs/ARCHITECTURE.md` | System diagram, Token Bridge, security model |
| `docs/DATA_MODEL.md` | All 20 entity schemas |
| `docs/API.md` | Full API reference (~50 endpoints) |
| `docs/AUTH_FLOW.md` | OIDC PKCE walkthrough, JWT structure |
| `docs/CONNECTOR_SPEC.md` | App onboarding guide, user mapping, entitlement design |

---

## Known Fixes Applied

- **Docker port**: mapped to `5433` (not `5432`) to avoid local PostgreSQL 13 conflict
- **keys.ts**: uses `jose` export functions, not `globalThis.crypto.subtle` (unavailable in ts-node)
- **ReviewsComponent**: `DatePipe` removed from imports (unused, caused build warning)
