# Local development

How to run Rescope Surveys on your laptop while writing code.

---

## Prerequisites

- Node.js 20+
- Docker (for Postgres and optional full-stack Docker runs)
- `npm install` in repo root and `npm install --prefix server`

```bash
git clone <repository-url>
cd survey-builder
npm install
npm install --prefix server
cp .env.example .env   # edit as needed
```

---

## Recommended: API mode with hot reload

Best for everyday feature work. Vite and the API restart on file changes; Postgres runs in Docker.

```bash
npm run dev:docker
```

| Service | URL |
|---------|-----|
| Frontend (Vite) | http://localhost:5173 |
| API (Fastify) | http://localhost:3003 |
| Postgres | localhost:5433 |

**Default logins** (seeded on first API start in development):

| Account | Email / username | Password | Role |
|---------|------------------|----------|------|
| Org admin | `admin` or `admin@rescopesurveys.local` | `admin123` | admin |
| Platform owner | `vendor` or `vendor@rescopesurveys.local` | `vendor123` | platform_owner |

What `dev:docker` does:

1. Starts Postgres via `docker-compose.yml` + `docker-compose.dev.yml`
2. Runs Vite with `VITE_USE_API=true` and the API with `npm run dev:server`

### Postgres only (manual control)

```bash
npm run db:up              # start Postgres
npm run db:reset           # wipe volume + fresh DB
npm run db:migrate:dev --prefix server   # create/apply migrations
npm run dev:all            # Vite + API (after db:up)
```

---

## Option: localStorage mode (no backend)

Fast UI-only work; data stays in the browser.

```bash
npm run dev
```

Open http://localhost:5173 — default login `admin` / `admin123` (localStorage, not Postgres).

---

## Option: full Docker stack (production-like build)

Use when you want to test the **same images** partners pull from Docker Hub, without hot reload.

```bash
docker compose up --build -d
open http://localhost:8080
```

Demo login: `admin` / `admin123` (seed enabled by default in base compose).

To reset the demo database:

```bash
docker compose down -v
docker compose up -d
```

---

## Option: Docker dev override (Compose dev stack)

Runs the full stack with development API settings (seed, relaxed JWT, `COOKIE_SECURE=false`):

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d
```

App UI: http://localhost:8080

---

## Which compose file when developing?

| Task | Command |
|------|---------|
| Daily coding | `npm run dev:docker` — uses `docker-compose.dev.yml` for Postgres only |
| Test Hub images locally | `docker compose up -d` — base compose only |
| Match production nginx path | `docker compose up --build -d` |
| Load testing | `./scripts/load/run-load-test.sh` — uses `docker-compose.load.yml` |

**Do not use `docker-compose.prod.yml` on your laptop** unless you are explicitly testing production env vars. It disables seed accounts and requires strong secrets.

---

## Verify after changes

```bash
npm run check:registries
npm run test:track-a          # frontend unit tests
npm run test:config           # config / JWT validation
```

Integration tests (`test:rbac*`, `test:security`) need a running API — see [CI.md](CI.md).

Manual checklist: [SMOKE_CHECKLIST.md](SMOKE_CHECKLIST.md).

---

## Environment variables (dev)

See [.env.example](../.env.example). Minimum for API mode:

```bash
DATABASE_URL=postgresql://rescopesurveys:rescopesurveys@localhost:5433/rescopesurveys
JWT_SECRET=dev-secret-local-only-not-for-production
# Uncomment in .env for Vite API mode when not using dev:docker:
# VITE_USE_API=true
```

`npm run dev:docker` sets `VITE_USE_API=true` for you.
