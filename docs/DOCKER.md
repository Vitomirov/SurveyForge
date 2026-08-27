# Docker Hub — build, publish, and partner demo

How to build container images, push them to Docker Hub, and let partners run the stack with one command.

---

## Images

| Image | Contents |
|-------|----------|
| `vitomirov/rescopesurveys-api` | Fastify API + Prisma (migrations run on startup) |
| `vitomirov/rescopesurveys-web` | React build + nginx (`VITE_USE_API=true`) |

Override the account with `DOCKERHUB_USER` in `.env` if you publish under a different username.

---

## Publish from your machine

### 1. Log in to Docker Hub

```bash
docker login
```

### 2. Build and push

```bash
# Push :latest
./scripts/deploy/publish-docker.sh

# Push a version tag (recommended for production rollback)
./scripts/deploy/publish-docker.sh v0.1.0
```

This builds both images locally and pushes:

- `vitomirov/rescopesurveys-api:<tag>`
- `vitomirov/rescopesurveys-web:<tag>`

When the tag is `latest`, the script also tags `latest` explicitly.

### 3. Verify on Docker Hub

Confirm both repositories show the new tag digest.

---

## Partner / demo — pull and run

Partners need only Docker, Compose, and `docker-compose.yml` from this repo (or a release bundle).

```bash
docker compose pull
docker compose up -d
```

Open http://localhost:8080

| Login | Password |
|-------|----------|
| `admin` or `admin@rescopesurveys.local` | `admin123` |
| `vendor` or `vendor@rescopesurveys.local` | `vendor123` |

No `.env` file is required — defaults in `docker-compose.yml` are demo-safe only.

### Fresh demo (reset database)

```bash
docker compose down -v
docker compose pull
docker compose up -d
```

### Pin a specific version

Create `.env`:

```bash
DOCKERHUB_USER=vitomirov
IMAGE_TAG=v0.1.0
```

Then `docker compose pull && docker compose up -d`.

---

## Base compose vs production

| Setting | `docker-compose.yml` (partner) | `docker-compose.prod.yml` (VPS) |
|---------|-------------------------------|--------------------------------|
| Seed accounts | yes (`admin/admin123`) | no — signup only |
| `COOKIE_SECURE` | `false` (HTTP localhost OK) | `true` (HTTPS required) |
| Web port bind | `0.0.0.0:8080` | `127.0.0.1:8080` (Caddy only) |
| JWT | demo default allowed | strong secret required |

Partners use **base compose only**. Production uses base + prod override — see [DEPLOY.md](DEPLOY.md).

---

## Build locally without pushing

```bash
docker compose up --build -d
```

Uses local Dockerfiles instead of Hub images. Good for testing changes before publish.

---

## CI publish (optional)

GitHub Actions can publish on version tags — see [CI.md](CI.md). Requires `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` repository secrets.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Login fails with `admin/admin123` | Use email `admin@rescopesurveys.local`; or reset DB with `docker compose down -v` |
| Port 8080 already in use | `WEB_HOST_PORT=8081 docker compose up -d` |
| Old image cached | `docker compose pull && docker compose up -d --force-recreate` |
| API restart loop | `.env` `POSTGRES_PASSWORD` must match the password the `pgdata` volume was created with |
