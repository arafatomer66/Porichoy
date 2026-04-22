# Porichoy (পরিচয়) — Identity & Access Management Platform

A lightweight, self-hosted IAM + Identity Governance platform for small businesses. Inspired by **SailPoint** (governance) and **Ping Identity** (authentication/authorization), but simplified and practical.

## What is Porichoy?

Porichoy combines two complementary identity capabilities into one platform:

| Side | Inspired By | What It Does |
|------|-------------|-------------|
| **Ping Side** (IAM) | Ping Identity | Authentication, SSO, MFA/OTP, OAuth2/OIDC, authorization policies, session management |
| **SailPoint Side** (IGA) | SailPoint | Application onboarding, user provisioning, role management, access reviews, audit trails |

**How they work together**: Ping handles *"prove who you are"* + *"are you allowed?"* → SailPoint handles *"what should you have access to?"* + *"is that still appropriate?"*

## Architecture

```
                      Porichoy
  ┌───────────────────────────────────────┐
  │  ┌────────────┐    ┌──────────────┐   │
  │  │   Ping     │    │  SailPoint   │   │
  │  │   (IAM)    │    │   (IGA)      │   │
  │  │            │    │              │   │
  │  │ Auth, SSO  │    │ Governance,  │   │
  │  │ OAuth2,    │    │ Roles, Apps, │   │
  │  │ Policies   │    │ Reviews,     │   │
  │  │            │    │ Audit        │   │
  │  └─────┬──────┘    └──────┬───────┘   │
  │        └──── Identity ────┘           │
  │             Core                      │
  └──────────────┬────────────────────────┘
                 │
            PostgreSQL
```

## Tech Stack

- **Backend**: Node.js 20+ + Express + TypeORM + PostgreSQL 16
- **Frontend**: Angular 19 + @ngrx/signals
- **Monorepo**: Nx workspace
- **Token Signing**: RS256 (asymmetric keys, JWKS endpoint)
- **Auth Protocol**: OAuth2 / OpenID Connect with PKCE

## Quick Start

```bash
# Prerequisites: Node.js 20+, Docker

# 1. Start database (maps to port 5433 to avoid conflicts with local PostgreSQL)
docker compose up -d

# 2. Install dependencies
npm install

# 3. Seed demo data (identities, roles, apps, access review)
npx ts-node --project apps/api/tsconfig.app.json -r tsconfig-paths/register apps/api/src/seed.ts

# 4. Start API
npx nx serve api

# 5. Start Web UI
npx nx serve web
```

- **API**: http://localhost:3400
- **Web UI**: http://localhost:3401
- **Dev OTP**: `123456`

### Demo Accounts

| Email | Password | Access |
|-------|----------|--------|
| admin@porichoy.com | admin123 | Porichoy admin — full access to all panels |
| alice@gonok.com | alice123 | Sales Manager + Inventory Clerk roles |
| bob@gonok.com | bob123 | Finance Officer + Auditor roles |

### Troubleshooting

**Port conflict on 5432** — If you have a local PostgreSQL instance already running on port 5432, Docker maps to port **5433** by design. Ensure `.env` has `DB_PORT=5433`.

**OTP in dev mode** — `OTP_DEV_MODE=true` is set by default; any OTP prompt accepts `123456`. To use real OTP delivery, set `OTP_DEV_MODE=false` and configure an SMS/email provider.

**Keys not found** — The API auto-generates RSA key files in `.keys/` on first startup. If you see key errors, delete the `.keys/` directory and restart.

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/ARCHITECTURE.md) | System architecture, how Ping + SailPoint sides interact |
| [Data Model](docs/DATA_MODEL.md) | Complete database schema with all entities |
| [API Reference](docs/API.md) | All endpoints — Ping side, SailPoint side, Audit |
| [Auth Flow](docs/AUTH_FLOW.md) | OIDC authorization code flow with PKCE, token details |
| [Connector Spec](docs/CONNECTOR_SPEC.md) | How connected apps integrate with Porichoy |

## Project Structure

```
porichoy/
  apps/
    api/                          # Express backend
      src/
        modules/
          ping/                   # IAM Side
            auth/                 #   Authentication (register, login, OTP, MFA)
            oauth/                #   OAuth2/OIDC provider
            authz/                #   Authorization policy evaluation
            sessions/             #   Session management
            clients/              #   OAuth client management
          sailpoint/              # IGA Side
            applications/         #   Application onboarding & connectors
            roles/                #   Role & entitlement management
            assignments/          #   Identity-role grants, SoD checks
            reviews/              #   Access certification campaigns
            lifecycle/            #   Joiner/Mover/Leaver workflows
          audit/                  # Shared audit logging
        entities/                 # TypeORM entities
        middleware/               # Auth, admin, audit, error middleware
        config/                   # Environment, database, key management
    web/                          # Angular frontend
      src/app/
        features/
          auth/                   # Login, register, OTP pages
          consent/                # OAuth consent screen
          admin/                  # Admin dashboard
            dashboard/            #   Overview & stats
            applications/         #   Manage connected apps
            roles/                #   Role & entitlement management
            identities/           #   User directory & role assignments
            sod-policies/         #   Separation of duties rules
            access-reviews/       #   Certification campaigns
            audit-logs/           #   Audit trail viewer
            policies/             #   Authorization policies
            clients/              #   OAuth client management
            lifecycle/            #   Lifecycle event management
  libs/
    shared-types/                 # Shared TypeScript interfaces & enums
  docs/                           # Detailed documentation
```

## License

MIT
