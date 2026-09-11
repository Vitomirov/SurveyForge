# CI/CD

Continuous integration and delivery — automated testing, image publishing, and VPS deployment.

**Related:** [DOCKER.md](DOCKER.md) · [DEPLOY.md](DEPLOY.md) · [OPERATIONS.md](OPERATIONS.md)

---

## Pipeline overview

```
┌────────────── Workstation / GitHub ──────────────┐
│  Feature branch → PR → CI (tests, docker build)  │
│  Merge to main → CD (build, push Hub, SSH deploy)│
│  Tag v*.*.* → docker-publish (semver images)     │
└──────────────────────┬───────────────────────────┘
                       ▼
┌────────────── VPS ───────────────────────────────┐
│  deploy.sh pulls tagged images, health check     │
└──────────────────────────────────────────────────┘
```

---

## What runs without a VPS

| Step | Location |
|------|----------|
| Unit tests and registry check | GitHub Actions |
| Docker build validation | GitHub Actions |
| Push images to Docker Hub | GitHub Actions or `publish-docker.sh` |
| Local demo | `docker compose up -d` |
| DNS planning, secret generation | Workstation |

Provision a VPS when images are on Docker Hub and DNS is ready.

---

## GitHub Actions workflows

Workflows: [`.github/workflows/`](../.github/workflows/)

### `ci.yml` — every push and pull request

No secrets required:

1. `npm ci` (root + server)
2. `npm run check:registries`
3. Unit tests (`test:track-a`, `test:config`, selected suites)
4. `docker compose config` (base + prod merge)
5. `docker build` for API and web (**no push**)

### `docker-publish.yml` — publish to Docker Hub

Triggers:

- Git tag matching `v*.*.*`
- Manual workflow_dispatch

Secrets:

| Secret | Value |
|--------|-------|
| `DOCKERHUB_USERNAME` | Docker Hub username |
| `DOCKERHUB_TOKEN` | Hub access token |

```bash
git tag v0.1.0
git push origin v0.1.0
```

### `cd.yml` — deploy to VPS after CI on `main`

```
push to main → CI passes → build images → Docker Hub → SSH deploy
```

Secrets:

| Secret | Purpose |
|--------|---------|
| `DOCKERHUB_USERNAME` | Push images |
| `DOCKERHUB_TOKEN` | Push images |
| `VPS_HOST` | SSH target IP or hostname |
| `VPS_USER` | SSH user (e.g. `root`) |
| `VPS_SSH_KEY` | Private key (full PEM) |
| `IMAGE_TAG` | *(optional)* defaults to `v0.1.0` |

CD also syncs compose files, deploy scripts, and Caddyfile; reloads Caddy when the Caddyfile changed.

---

## Recommended release flow

1. Feature branch + PR
2. CI passes → merge to `main`
3. Tag `v0.1.0` → images published
4. VPS: `IMAGE_TAG=v0.1.0` in `.env`
5. VPS: `./scripts/deploy/deploy.sh v0.1.0`
6. Verify with `./scripts/deploy/verify.sh` and browser checks

### Manual deploy (fallback)

```bash
./scripts/deploy/publish-docker.sh v0.1.1
./scripts/deploy/sync-to-vps.sh root@VPS_IP
ssh root@VPS_IP 'cd /opt/rescopesurveys && ./scripts/deploy/deploy.sh v0.1.1'
```

---

## Run CI checks locally

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

## Integration tests

RBAC and security integration tests need a live API + Postgres. Not in the default CI job (keeps CI fast and secret-free).

Run before major releases:

```bash
npm run dev:docker
npm run test:rbac1
npm run test:security
```

Adding a CI job with `docker compose up` + integration tests is a recommended next step.
