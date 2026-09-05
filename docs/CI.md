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

Automatic deploy **to** the VPS runs via [`.github/workflows/cd.yml`](../.github/workflows/cd.yml) after CI passes on `main` (build → Hub → SSH deploy). Tag releases with `v*.*.*` still use [`docker-publish.yml`](../.github/workflows/docker-publish.yml) for semver rollbacks.

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

## CD — deploy to VPS after CI on `main`

Workflow: [`.github/workflows/cd.yml`](../.github/workflows/cd.yml)

```
push to main → CI passes → CD builds images → Docker Hub → SSH deploy on VPS
```

Image tag: `v0.1.0` by default (same as your VPS `.env`). Override with an `IMAGE_TAG` repository secret when you bump versions.

### Repository secrets (Settings → Secrets → Actions)

| Secret | Example | Purpose |
|--------|---------|---------|
| `DOCKERHUB_USERNAME` | `vitomirov` | Push API + web images |
| `DOCKERHUB_TOKEN` | Hub access token | Push API + web images |
| `VPS_HOST` | `49.13.12.162` | SSH target |
| `VPS_USER` | `root` | SSH user |
| `VPS_SSH_KEY` | contents of `~/.ssh/id_ed25519` | Private key (full PEM, including newlines) |
| `IMAGE_TAG` | *(optional)* `v0.1.0` | Docker Hub + VPS deploy tag; defaults to `v0.1.0` |

`VPS_SSH_KEY` must match a public key in `/root/.ssh/authorized_keys` on the VPS.

CD also copies `docker-compose*.yml`, `scripts/deploy/*`, and `docker/caddy/Caddyfile`, then reloads Caddy when the Caddyfile changed.

### Manual deploy (fallback)

```bash
./scripts/deploy/publish-docker.sh v0.1.1
./scripts/deploy/sync-to-vps.sh root@VPS_IP
ssh root@VPS_IP 'cd /opt/rescopesurveys && ./scripts/deploy/deploy.sh v0.1.1'
```

---

## Future: deploy to VPS from CI

Implemented — see **CD** section above. Optional later: deploy only on `v*.*.*` tags instead of every `main` push.

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
