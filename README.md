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

- **Backend**: Node.js + Express + TypeORM + PostgreSQL
- **Frontend**: Angular 21 + @ngrx/signals
- **Monorepo**: Nx workspace
- **Token Signing**: RS256 (asymmetric keys, JWKS endpoint)
- **Auth Protocol**: OAuth2 / OpenID Connect with PKCE

## Quick Start

```bash
# Prerequisites: Node.js 20+, Docker

# Start database
docker compose up -d

# Install dependencies
npm install

# Start API
npx nx serve api

# Start Web UI
npx nx serve web
```

- **API**: http://localhost:3400
- **Web UI**: http://localhost:3401
- **Dev OTP**: `123456`

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/ARCHITECTURE.md) | System architecture, how Ping + SailPoint sides interact |
| [Data Model](docs/DATA_MODEL.md) | Complete database schema with all entities |
| [API Reference](docs/API.md) | All endpoints — Ping side, SailPoint side, Audit |
| [Auth Flow](docs/AUTH_FLOW.md) | OIDC authorization code flow with PKCE, token details |
| [Roadmap](docs/ROADMAP.md) | Phased build plan from MVP to full platform |
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
