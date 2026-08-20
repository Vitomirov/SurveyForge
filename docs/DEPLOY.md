# Production deployment — VPS with Caddy + Docker

Step-by-step guide for deploying Rescope Surveys to a single Ubuntu VPS with
HTTPS on `rescopesurveys.com`, `www.rescopesurveys.com`, and
`surveys.rescopesurveys.com`.

Written for a first deploy: every command is meant to be run in order. Anything
marked **manual** is something you do once on the server.

---

## 1. Architecture overview

```
Internet
  │
  ▼
Caddy — VPS host, ports 80/443                     ← TLS + domain routing
  │   rescopesurveys.com
  │   www.rescopesurveys.com
  │   surveys.rescopesurveys.com
  │   automatic Let's Encrypt certificates
  ▼
127.0.0.1:8080  (WEB_HOST_PORT — loopback only, never public)
  │
  ▼
┌─────────────────────────────── Docker Compose ───────────────────────────────┐
│                                                                              │
│  web container — nginx:80                                                    │
│    ├── /            → React static build (built with VITE_USE_API=true)      │
│    ├── /api/        → api:3003                                               │
│    └── /health      → api:3003/health                                        │
│                     │                                                        │
│                     ▼                                                        │
│  api container — Fastify:3003 (not published on the host)                    │
│                     │                                                        │
│                     ▼                                                        │
│  postgres container — 5432 (not published on the host)                       │
│    volume: pgdata                                                            │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Why two proxy layers

The nginx inside the web container is part of the application image: it serves
the SPA build, rewrites unknown paths to `index.html` (needed for white-label
survey URLs), sets cache headers for hashed assets, and proxies `/api/` to the
API container over the Docker network. It ships with the image and is identical
in local Docker, load tests, and production.

Caddy on the host handles everything that is specific to *this* server: TLS
certificates, the real domain names, and HTTP→HTTPS redirects. Keeping it
outside Docker means certificates and domains are managed with `systemctl` and
survive any `docker compose down`, and the application image stays
environment-agnostic.

All three domains proxy to the same container. The app decides what to render
from the hostname: on `surveys.rescopesurveys.com` the first path segment is
treated as a survey `publicPath`, everywhere else the SPA dashboard loads.

---

## 2. Prerequisites

| Requirement | Notes |
|-------------|-------|
| VPS | Ubuntu 22.04 or 24.04, 2 vCPU / 4 GB RAM recommended (matches the load-test budget) |
| Root or sudo access | For Docker, Caddy, and ufw |
| Domain | `rescopesurveys.com` with editable DNS records |
| Docker Engine | Installed in step 5 |
| Docker Compose | **v2.24 or newer** — `docker-compose.prod.yml` uses the `!override` tag (see step 5 for the fallback) |
| Docker Hub images | Published from your machine with `./scripts/publish-docker.sh v0.1.0` before the first deploy |

Ports used: `22` (SSH), `80`/`443` (Caddy). Nothing else needs to be reachable
from the internet.

---

## 3. DNS setup

Create these records at your DNS provider, replacing `203.0.113.10` with your
VPS IPv4 address. Do this **before** installing Caddy — Let's Encrypt validates
over HTTP, so the names must already resolve to the server.

| Type | Name | Value | TTL |
|------|------|-------|-----|
| `A` | `@` (apex → `rescopesurveys.com`) | `203.0.113.10` | 300 |
| `A` | `www` | `203.0.113.10` | 300 |
| `A` | `surveys` | `203.0.113.10` | 300 |

`CNAME` records pointing `www` and `surveys` to the apex work equally well if
your provider supports it (the apex itself must stay an `A` record):

| Type | Name | Value |
|------|------|-------|
| `CNAME` | `www` | `rescopesurveys.com.` |
| `CNAME` | `surveys` | `rescopesurveys.com.` |

If the VPS has IPv6, add matching `AAAA` records. Verify propagation before
continuing:

```bash
dig +short rescopesurveys.com
dig +short www.rescopesurveys.com
dig +short surveys.rescopesurveys.com
```

All three must print your VPS IP.

---

## 4. Secrets — `.env` on the VPS

`.env` lives only on the server. It is listed in `.gitignore` and must **never**
be committed, pasted into issues, or copied into the Docker images.

Generate the secrets:

```bash
openssl rand -base64 24   # POSTGRES_PASSWORD
openssl rand -base64 48   # JWT_SECRET (must be 32+ characters)
```

Then create `/opt/rescopesurveys/.env`:

```bash
# Database
POSTGRES_USER=rescopesurveys
POSTGRES_DB=rescopesurveys
POSTGRES_PASSWORD=<openssl rand -base64 24>

# Auth — the API refuses to start in production with a weak or placeholder value
JWT_SECRET=<openssl rand -base64 48>

# Images to run — prefer an explicit version tag over `latest` so rollback is possible
DOCKERHUB_USER=vitomirov
IMAGE_TAG=v0.1.0

# Host port for the web container — internal only, Caddy proxies to it
WEB_HOST_PORT=8080

# Always include the production override in bare `docker compose` commands
COMPOSE_FILE=docker-compose.yml:docker-compose.prod.yml
```

| Variable | Why it matters |
|----------|----------------|
| `POSTGRES_PASSWORD` | Required by Compose; interpolated into `DATABASE_URL`. Never reuse the local dev default (`rescopesurveys`). |
| `JWT_SECRET` | Required, 32+ characters. `REQUIRE_STRONG_JWT` is on in production, so placeholders like `change-me-in-production` cause a startup failure. |
| `DOCKERHUB_USER` | Docker Hub account holding `rescopesurveys-api` / `rescopesurveys-web`. |
| `IMAGE_TAG` | The deployed version. Semver tags (`v0.1.0`) make rollback a one-line change; `latest` does not. |
| `WEB_HOST_PORT` | Host port for nginx. Bound to `127.0.0.1` by `docker-compose.prod.yml` — not public. Keep it a bare port number. |
| `COMPOSE_FILE` | Makes plain `docker compose pull` / `up -d` load `docker-compose.prod.yml` automatically. Set on the VPS only. |

Nothing about Caddy belongs in `.env` — domains and TLS are configured on the
host in `/etc/caddy/Caddyfile` (step 6).

**No seeded accounts in production.** `docker-compose.yml` sets
`SEED_DEFAULT_ACCOUNTS=false`, so there is no default `admin` / `admin123`. The
first organization and admin are created through the signup form after deploy.

---

## 5. First VPS deploy

### 5.1 Install Docker

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Confirm the Compose version — `docker-compose.prod.yml` needs v2.24+:

```bash
docker compose version
```

If it is older and you cannot upgrade: delete `docker-compose.prod.yml`, remove
`COMPOSE_FILE` from `.env`, and set `WEB_HOST_PORT=127.0.0.1:8080` instead. That
produces the same loopback binding.

### 5.2 Copy the deployment files

Only three things are needed on the server: the Compose files, the deploy
script, and `.env`. Cloning the repository is the simplest way to keep them in
sync:

```bash
sudo mkdir -p /opt/rescopesurveys
sudo chown "$USER" /opt/rescopesurveys
git clone <repository-url> /opt/rescopesurveys
cd /opt/rescopesurveys
```

Or copy just the required files from your machine:

```bash
scp docker-compose.yml docker-compose.prod.yml user@203.0.113.10:/opt/rescopesurveys/
scp scripts/deploy.sh user@203.0.113.10:/opt/rescopesurveys/scripts/
scp docker/caddy/Caddyfile user@203.0.113.10:/opt/rescopesurveys/docker/caddy/
```

Then create `.env` on the server as described in step 4. Do **not** `scp` your
local `.env` — it contains development values.

### 5.3 Start the stack

```bash
cd /opt/rescopesurveys
docker compose pull
docker compose up -d
docker compose ps
```

With `COMPOSE_FILE` set in `.env`, those commands already include
`docker-compose.prod.yml`. Without it, spell both files out:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

The API applies Prisma migrations on startup, so the first boot takes a few
extra seconds.

### 5.4 Verify locally, before TLS

```bash
curl http://127.0.0.1:8080/health
# {"status":"ok",...}

curl -I http://127.0.0.1:8080/
# HTTP/1.1 200 OK
```

Confirm the port is *not* published publicly:

```bash
sudo ss -tlnp | grep 8080
# expected: 127.0.0.1:8080   (never 0.0.0.0:8080 or *:8080)
```

Do not open the app in a browser over plain HTTP yet — logging in requires
HTTPS (step 6).

---

## 6. Caddy on the host

### 6.1 Install

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
```

The package installs and starts a `caddy` systemd service.

### 6.2 Configure

Use the template from this repository, [`docker/caddy/Caddyfile`](../docker/caddy/Caddyfile):

```
rescopesurveys.com, www.rescopesurveys.com, surveys.rescopesurveys.com {
	reverse_proxy 127.0.0.1:8080
}
```

Install it and reload:

```bash
sudo cp /opt/rescopesurveys/docker/caddy/Caddyfile /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl enable caddy
sudo systemctl reload caddy      # use `restart` if the service is not running yet
sudo systemctl status caddy
```

That is the entire configuration. Caddy requests certificates for all three
names on first request, renews them automatically, redirects HTTP to HTTPS, and
sets `X-Forwarded-Proto: https` on proxied requests. No email address is needed
for the ACME account; add one only if you want expiry notices:

```
{
	email ops@rescopesurveys.com
}
```

Watch the first certificate issuance:

```bash
sudo journalctl -u caddy -f
```

### 6.3 HTTPS is not optional

`docker-compose.yml` sets `COOKIE_SECURE=true`, so the API issues session
cookies with the `Secure` attribute. Browsers refuse to store those over plain
HTTP. **Without Caddy and a valid certificate, login and signup will appear to
succeed but no session will persist.** Never work around this by disabling
`COOKIE_SECURE` in production.

---

## 7. Firewall (ufw)

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp        # SSH — do this before enabling
sudo ufw allow 80/tcp        # HTTP (Let's Encrypt + redirect to HTTPS)
sudo ufw allow 443/tcp       # HTTPS
sudo ufw enable
sudo ufw status verbose
```

Port `8080` and Postgres `5432` are never allowed.

**Important:** ufw alone does not protect Docker-published ports. Docker inserts
its own iptables rules in the `DOCKER-USER` chain, which bypass ufw's filtering,
so a container published on `0.0.0.0:8080` stays reachable from the internet
even with `ufw deny 8080`. This is why the loopback bind is the real control:

- `docker-compose.prod.yml` publishes the web container as
  `127.0.0.1:${WEB_HOST_PORT}:80`, reachable only from the host — which is
  exactly what Caddy needs.
- `docker-compose.yml` never publishes Postgres. Only the dev override
  (`docker-compose.dev.yml`, not used on the VPS) exposes `5433`. The API talks
  to Postgres over the internal Docker network.

Verify from your laptop, not from the server:

```bash
curl --max-time 5 http://rescopesurveys.com:8080/    # must time out or refuse
nc -zv rescopesurveys.com 5432                       # must fail
```

---

## 8. Post-deploy verification

| # | Check | Expected |
|---|-------|----------|
| 1 | `curl -I https://rescopesurveys.com` | `200`, valid certificate, no TLS warning |
| 2 | `curl https://rescopesurveys.com/health` | `{"status":"ok",...}` |
| 3 | Open `https://rescopesurveys.com` in a browser | SPA loads, login screen |
| 4 | Sign up the first account | Organization created, dashboard loads |
| 5 | Reload the page after signup | Still logged in — proves `Secure` cookies work over HTTPS |
| 6 | `curl -I https://www.rescopesurveys.com` | `200` (or `301` to the apex if you enabled the redirect) |
| 7 | `curl -I https://surveys.rescopesurveys.com/test-path` | `200` with the SPA shell; the app then shows "survey not found" — that is fine, it proves the subdomain and TLS work |
| 8 | Publish a survey, open its `surveys.rescopesurveys.com/<publicPath>` link | Survey renders and accepts a response |
| 9 | `curl -I http://rescopesurveys.com` | `308`/`301` redirect to HTTPS |
| 10 | `docker compose ps` | All three services `Up`, api and postgres `healthy` |

Check 5 is the one people skip and then debug for an hour — do it.

---

## 9. Updates (redeploy)

Publish new images from your machine:

```bash
docker login
./scripts/publish-docker.sh v0.1.1
```

Then on the VPS:

```bash
cd /opt/rescopesurveys
# bump IMAGE_TAG=v0.1.1 in .env
./scripts/deploy.sh
```

[`scripts/deploy.sh`](../scripts/deploy.sh) refuses to run with missing or
placeholder secrets, pulls the images, restarts the stack, waits up to 60
seconds for `/health`, and prints container status. Equivalent manual commands:

```bash
docker compose pull
docker compose up -d
curl http://127.0.0.1:8080/health
```

Only containers whose image changed are recreated. Postgres keeps its data in
the `pgdata` volume, which is untouched by pulls and restarts. Caddy is not
involved in an app update — no reload needed unless you change domains.

---

## 10. Rollback

Version tags exist for exactly this. On the VPS:

```bash
cd /opt/rescopesurveys
# set IMAGE_TAG=v0.1.0 (the last known good tag) in .env
docker compose pull
docker compose up -d
curl http://127.0.0.1:8080/health
```

Rolling back the images does **not** roll back database migrations. If a release
contained a destructive migration, restore the database from a backup (step 11)
before starting the older image.

---

## 11. Postgres backup

Dump to a gzipped file on the host:

```bash
cd /opt/rescopesurveys
docker compose exec -T postgres \
  pg_dump -U rescopesurveys rescopesurveys \
  | gzip > "backup-$(date +%F-%H%M).sql.gz"
```

Restore into a running stack:

```bash
gunzip -c backup-2026-01-31-0300.sql.gz \
  | docker compose exec -T postgres psql -U rescopesurveys -d rescopesurveys
```

A nightly cron entry (backups written to `/opt/backups`, kept 14 days):

```bash
0 3 * * * cd /opt/rescopesurveys && docker compose exec -T postgres pg_dump -U rescopesurveys rescopesurveys | gzip > /opt/backups/rescopesurveys-$(date +\%F).sql.gz && find /opt/backups -name '*.sql.gz' -mtime +14 -delete
```

Copy backups off the VPS — a snapshot stored only on the server that failed is
not a backup. Adjust the user and database name if you changed `POSTGRES_USER`
or `POSTGRES_DB`.

---

## 12. Troubleshooting

**Certificate errors / Caddy cannot issue a certificate**

```bash
sudo journalctl -u caddy -n 100 --no-pager
```

Usual causes: DNS not propagated yet (`dig +short <name>` returns nothing or an
old IP), port 80 blocked by ufw or another web server (`sudo ss -tlnp | grep :80`
— nginx or Apache installed by default will hold it), or Let's Encrypt rate
limits after repeated failures (retry after an hour, or test against the staging
CA with `acme_ca https://acme-staging-v02.api.letsencrypt.org/directory`).

**502 Bad Gateway from Caddy**

The container is not answering on the loopback port. Check in this order:

```bash
docker compose ps                        # is web Up?
curl http://127.0.0.1:8080/health        # does the stack answer locally?
sudo ss -tlnp | grep 8080                # is it bound to 127.0.0.1:8080?
docker compose logs --tail 50 web api
```

A mismatch between `WEB_HOST_PORT` in `.env` and the port in
`/etc/caddy/Caddyfile` produces exactly this. They must match.

**Login works but the session is lost on reload**

You are on plain HTTP, or the certificate is invalid. `COOKIE_SECURE=true`
requires HTTPS. Confirm with `curl -I https://rescopesurveys.com` and check the
browser console for rejected cookies.

**API container restarts in a loop**

```bash
docker compose logs --tail 100 api
```

Most common: `JWT_SECRET` shorter than 32 characters or still a placeholder
(production enforces `REQUIRE_STRONG_JWT`), or a `POSTGRES_PASSWORD` that does
not match the one the `pgdata` volume was initialized with. Changing
`POSTGRES_PASSWORD` after the first start does **not** change the existing
database password — either use the original value or reset the role inside
Postgres.

**`docker compose up` fails with "port is already allocated"**

Compose *appends* `ports` entries from override files unless the `!override` tag
is honored, which needs Compose v2.24+. On older versions you get both
`0.0.0.0:8080` and `127.0.0.1:8080`. Upgrade Compose, or use the fallback from
step 5.1 (`WEB_HOST_PORT=127.0.0.1:8080`, no prod override file).

**`surveys.rescopesurveys.com/<path>` shows the dashboard instead of a survey**

The hostname must match `surveys.<domain>` exactly for path-based survey
resolution, and the survey must be `live` with that `publicPath`. Verify the
API directly: `curl https://surveys.rescopesurveys.com/api/public/surveys/<path>`.

**Everything looks fine but the site is unreachable**

Check the layers from the outside in: DNS (`dig`), firewall
(`sudo ufw status`), Caddy (`systemctl status caddy`), the stack
(`docker compose ps`), the app (`curl http://127.0.0.1:8080/health`).

---

## Quick reference

| Task | Command (on the VPS, in `/opt/rescopesurveys`) |
|------|------------------------------------------------|
| Deploy / update | `./scripts/deploy.sh` |
| Status | `docker compose ps` |
| Logs | `docker compose logs -f api` |
| Restart app | `docker compose restart api web` |
| Stop everything | `docker compose down` (data survives in `pgdata`) |
| Reload Caddy | `sudo systemctl reload caddy` |
| Backup | see step 11 |
