# Documentation

Guides for developing, publishing, and running Rescope Surveys.

---

## Start here

| I want to… | Guide |
|------------|-------|
| Run the app locally while coding | [DEVELOPMENT.md](DEVELOPMENT.md) |
| Build and push images to Docker Hub | [DOCKER.md](DOCKER.md) |
| Deploy to a production VPS | [DEPLOY.md](DEPLOY.md) |
| Set up CI/CD (with or without a server) | [CI.md](CI.md) |
| Manual QA after changes | [SMOKE_CHECKLIST.md](SMOKE_CHECKLIST.md) |
| Module / API reference | [PUBLIC_API.md](PUBLIC_API.md) |

---

## Compose files — one sentence each

| File | When to use it |
|------|----------------|
| `docker-compose.yml` | **Base stack** — partner demo, local Docker pull, or as the foundation for overrides |
| `docker-compose.dev.yml` | **npm dev** — exposes Postgres on `localhost:5433` |
| `docker-compose.prod.yml` | **Production VPS** — no seed accounts, HTTPS cookies, web bound to `127.0.0.1` only |
| `docker-compose.load.yml` | **Load tests** — separate project with CPU/RAM caps + k6 |

You almost never edit these for day-to-day work. Pick the right combination:

```bash
# Partner / demo (Docker Hub pull)
docker compose up -d

# npm dev (Postgres only in Docker)
npm run dev:docker

# Production VPS (set COMPOSE_FILE once in .env on the server)
COMPOSE_FILE=docker-compose.yml:docker-compose.prod.yml docker compose up -d
```

---

## Three environments at a glance

```
┌─────────────────────────────────────────────────────────────────────────┐
│ DEVELOPMENT (your laptop)                                               │
│   Vite :5173 + API :3003 + Postgres :5433                               │
│   Hot reload, seed accounts, relaxed auth                               │
│   → DEVELOPMENT.md                                                      │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ DOCKER HUB (images + partner demo)                                      │
│   docker compose pull && up -d  →  localhost:8080                     │
│   Pre-built images, demo login admin / admin123                         │
│   → DOCKER.md                                                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ PRODUCTION (VPS)                                                        │
│   Caddy :443 → 127.0.0.1:8080 → Docker stack                            │
│   Real domain, HTTPS, no seed, secrets in .env                          │
│   → DEPLOY.md                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Before you buy a server

You do **not** need a VPS to make progress. Do this first:

1. **Develop locally** — [DEVELOPMENT.md](DEVELOPMENT.md)
2. **Run tests in CI** — push to GitHub; see [CI.md](CI.md)
3. **Build and publish Docker images** — `./scripts/deploy/publish-docker.sh v0.1.0`
4. **Demo the stack locally** — `docker compose up -d` on your machine (same images partners get)
5. **Prepare production files** — generate secrets, read [DEPLOY.md](DEPLOY.md), buy domain DNS

Buy the VPS when you are ready to point DNS and run `./scripts/deploy/deploy.sh`.

---

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/dev/start-postgres.sh` | Postgres for npm dev |
| `scripts/deploy/publish-docker.sh` | Build + push API and web images |
| `scripts/deploy/deploy.sh` | Production redeploy on the VPS |
| `scripts/load/run-load-test.sh` | k6 load test stack |
