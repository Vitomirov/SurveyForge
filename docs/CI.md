# CI/CD

Continuous integration and delivery for Rescope Surveys — what runs automatically, what needs a server, and how to set it up.

---

## What you can do **before** buying a VPS

You do not need a production server to ship quality releases.

| Step | Where | Needs VPS? |
|------|-------|------------|
| Write code + local dev | Laptop | No |
| Unit tests + registry check | GitHub Actions (CI) | No |
| Build Docker images (verify Dockerfile) | GitHub Actions (CI) | No |
| Push images to Docker Hub | GitHub Actions or `./scripts/deploy/publish-docker.sh` | No |
| Partner demo on your laptop | `docker compose up -d` | No |
| Buy domain, plan DNS | Registrar | No |
| Generate production secrets | Laptop → save for later `.env` on VPS | No |
| Read [DEPLOY.md](DEPLOY.md) | — | No |

**Buy the VPS when** you have images on Docker Hub and are ready to point DNS and run the first deploy.

---

## What needs a server

| Step | Where |
|------|-------|
| First bootstrap (Docker, Caddy, ufw) | VPS — `./scripts/deploy/bootstrap-vps.sh` |
| Generate production `.env` | VPS — `./scripts/deploy/init-env.sh` |
| First `deploy.sh` / later updates | VPS |
| Let's Encrypt (after DNS) | Caddy on the VPS host |
| Off-site backups | `./scripts/deploy/backup.sh` + copy dumps off the server |

Automatic deploy **to** the VPS (SSH pull + restart) is not wired yet — deploy is manual or can be added later via SSH action / webhook.

---

## GitHub Actions workflows

Workflows live in [`.github/workflows/`](../.github/workflows/).

### `ci.yml` — on every push and pull request

Runs without secrets:

1. `npm ci` (root + server)
2. `npm run check:registries`
3. Unit tests (`test:track-a`, `test:config`, selected brand/unit suites)
4. `docker compose config` validation (base + prod merge)
5. `docker build` for API and web images (**no push**)

Purpose: catch broken builds and test failures before merge.

### `docker-publish.yml` — publish to Docker Hub

Triggers:

- Push a git tag matching `v*.*.*` (e.g. `v0.1.0`)
- Manual **workflow_dispatch** with a custom tag

Requires repository secrets:

| Secret | Value |
|--------|-------|
| `DOCKERHUB_USERNAME` | Your Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token ([create here](https://hub.docker.com/settings/security)) |

Add secrets: GitHub repo → **Settings** → **Secrets and variables** → **Actions**.

Typical release:

```bash
git tag v0.1.0
git push origin v0.1.0
# CI builds and pushes vitomirov/rescopesurveys-api:v0.1.0 and web:v0.1.0
```

Then on the VPS, set `IMAGE_TAG=v0.1.0` in `.env` and run `./scripts/deploy/deploy.sh`.

---

## Recommended release flow

```
┌─────────────── Local / GitHub (no VPS) ───────────────┐
│ 1. Feature branch + PR                                │
│ 2. CI passes (tests, docker build)                  │
│ 3. Merge to main                                    │
│ 4. Tag v0.1.0 → docker-publish pushes to Hub        │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────── VPS (first time or update) ────────────┐
│ 5. IMAGE_TAG=v0.1.0 in .env                         │
│ 6. ./scripts/deploy/deploy.sh                       │
│ 7. Verify https://your-domain.com                   │
└─────────────────────────────────────────────────────┘
```

---

## Running CI checks locally

Same commands as the workflow:

```bash
npm ci && npm ci --prefix server
npm run check:registries
npm run test:track-a
npm run test:config
docker compose -f docker-compose.yml -f docker-compose.prod.yml config
docker build -f server/Dockerfile -t rescopesurveys-api:test .
docker build --build-arg VITE_USE_API=true -t rescopesurveys-web:test .
```

---

## Future: deploy to VPS from CI

Not implemented yet. Options when you add a server:

1. **SSH action** — CI runs `deploy.sh` over SSH (needs `VPS_HOST`, `SSH_KEY` secrets)
2. **Watchtower / cron on VPS** — server pulls `:latest` on a schedule (simpler, less control)
3. **Webhook** — VPS listens for GitHub release events

For now, production deploy stays manual: `./scripts/deploy/deploy.sh` on the VPS after a successful Hub publish.

---

## Integration tests in CI

RBAC and security integration tests require a live API + Postgres. They are **not** in the default CI job yet (keeps CI fast and secret-free).

Run them locally before major releases:

```bash
npm run dev:docker   # or docker compose up -d
# in another terminal:
npm run test:rbac1
npm run test:security
```

Adding a CI job with `docker compose up` + integration tests is a good next step once the base pipeline is stable.
