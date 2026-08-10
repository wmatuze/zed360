# Zed360

Zed360 is Zambia's digital business ecosystem: infrastructure for discovering, evaluating, and connecting with legitimate businesses.

It is not a conventional business directory and it is not an e-commerce marketplace. A static listing is only one small part of the system. Zed360 is built around active customer intent, intelligent matching, current business information, direct responses, reputation, verification, and measurable outcomes.

## Core ecosystem loop

```text
Customer need
    ↓
Structured request
    ↓
Relevant, active businesses
    ↓
Current availability and responses
    ↓
Trusted customer decision
    ↓
Confirmed interaction and reputation signals
    ↓
Better future matching and business visibility
```

## Product pillars

- **Intent** — customers describe what they need, where, and when.
- **Discovery and matching** — Zed360 identifies businesses capable of helping.
- **Live business signals** — availability, activity, response time, and information freshness matter.
- **Trust** — ownership, registration, reputation, confirmed interactions, and moderation are distinct signals.
- **Connection** — customers contact and transact directly with businesses.
- **Business growth** — businesses receive relevant enquiries and build a durable digital reputation.

## Applications

- `apps/web` — public discovery, customer experience, business portal, and protected administration interface
- `apps/api` — authentication, business, request, matching, trust, and moderation API
- `apps/worker` — notifications, matching jobs, media processing, and scheduled freshness checks

## Shared packages

- `packages/database` — PostgreSQL/PostGIS schema, migrations, and queries
- `packages/contracts` — shared validation schemas and API contracts
- `packages/ui` — shared design tokens and reusable interface components
- `packages/config` — shared TypeScript and linting configuration

## Product and architecture decisions

- [Ecosystem architecture](docs/architecture.md)
- [Product principles](docs/product-principles.md)
- [Business verification and PACRA integration](docs/business-verification.md)
- [Supabase email authentication setup](docs/authentication-setup.md)
- [Business review administration](docs/admin-review.md)
- [Git branch and pull-request workflow](docs/git-workflow.md)

## Local development

No production credentials should ever be committed to Git; copy `.env.example` to `.env` when services are ready.

The request experience needs both the web application and API. The API uses
the managed PostgreSQL/PostGIS database configured in `.env`:

```powershell
pnpm.cmd install
pnpm.cmd dev:web
```

This starts the web application on `http://localhost:3000` and the API on
`http://localhost:4000`. Keep the PowerShell window open while testing.

## Database development

PostgreSQL with PostGIS is the permanent database choice. The normal development path uses a managed PostgreSQL instance with PostGIS enabled, so Docker is not required on a low-memory or low-storage computer.

The included `compose.yaml` is an optional convenience for developers who already have enough resources to run Docker. It is not a requirement for contributing to Zed360.

Follow the [managed database setup](docs/database-setup.md) when connecting PostgreSQL/PostGIS. Until then, the public interface can be developed without running PostgreSQL locally.
