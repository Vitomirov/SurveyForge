# Production deployment — VPS with Caddy + Docker

> **Other guides:** [Documentation index](README.md) · [Development](DEVELOPMENT.md) · [Docker Hub](DOCKER.md) · [CI/CD](CI.md)

Deploy Rescope Surveys to a single Ubuntu VPS with HTTPS on
`rescopesurveys.com`, `www.rescopesurveys.com`, and `surveys.rescopesurveys.com`.

Run the commands **in the order written**. Two machines are involved:


| Prompt looks like                    | You are on             | Run                                                                                   |
| ------------------------------------ | ---------------------- | ------------------------------------------------------------------------------------- |
| `devito@laptop:~/survey-builder$`    | **Laptop** (this repo) | `ssh`, `scp`, `./scripts/deploy/sync-to-vps.sh`, `./scripts/deploy/publish-docker.sh` |
| `root@ubuntu:~#` or `rescope@ubuntu:~$` | **VPS** (after `ssh`)  | `bootstrap-vps.sh`, `init-env.sh`, `deploy.sh`, `nano`, `docker`, `systemctl`         |


Leave the VPS with `exit` or `Ctrl+D`.

**What stays manual** (registrar / cloud console):

1. Buy the VPS and attach an SSH key (step 2).
2. Point DNS A records at that IPv4 and delete parking records (step 3).
3. After HTTPS works: sign up the first account in the browser (no seeded `admin/admin123` in production).

**What the scripts do:** copy files, install Docker and Caddy, write `.env` with `openssl`, open the firewall, pull images, health-check, dump Postgres.

---



## 1. Architecture

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

Caddy is **not** a Docker service. It runs on the Ubuntu host (`systemctl`). The nginx
inside the web image is unchanged: SPA, `/api/` proxy, cache headers. Production
settings that differ from the partner demo live in `docker-compose.prod.yml`:


| Setting              | `docker-compose.yml` (demo) | `docker-compose.prod.yml` (VPS)            |
| -------------------- | --------------------------- | ------------------------------------------ |
| Seed accounts        | yes (`admin` / `admin123`)  | **no** — first user signs up               |
| `COOKIE_SECURE`      | `false`                     | `true` (HTTPS required or sessions vanish) |
| Web bind             | `0.0.0.0:8080`              | `127.0.0.1:8080` (Caddy only)              |
| `REQUIRE_STRONG_JWT` | off                         | on                                         |


On `surveys.rescopesurveys.com` the first path segment is a survey `publicPath`.
On the apex and `www` the dashboard SPA loads.

---



## 2. Buy the VPS (Hetzner Cloud console)

This is the only cloud-console step besides DNS.


| Field          | Value                                                                            |
| -------------- | -------------------------------------------------------------------------------- |
| Location       | Falkenstein (`fsn1`) or Nuremberg (`nbg1`)                                       |
| Image          | **Ubuntu 24.04** (22.04 is fine)                                                 |
| Type           | **CX22** (2 vCPU / 4 GB) matches the load-test budget; CX32 if you want headroom |
| IPv4           | **Must be enabled** — Let's Encrypt and A records need a public IPv4             |
| SSH key        | Paste `~/.ssh/id_ed25519.pub` (or `id_rsa.pub`) **before** you create the server |
| Cloud firewall | Allow TCP `22`, `80`, `443` only                                                 |
| Backups        | Optional Hetzner disk snapshots — not a substitute for `backup.sh`               |


Write down the IPv4. Below it is `VPS_IP`.

First login, from the **laptop**:

```bash
ssh root@VPS_IP
```

If the key was attached at create time, there is no password. Optional but
recommended: create a sudo user and use it from then on.

```bash
adduser rescope
usermod -aG sudo rescope
rsync --archive --chown=rescope:rescope /root/.ssh /home/rescope/
exit
```

Then from the laptop: `ssh rescope@VPS_IP`. The scripts work as `root` or as a sudo user.

---



## 3. DNS (Namecheap Advanced DNS) — do this before Caddy reloads

Let's Encrypt proves control of the names over **HTTP on port 80**. If DNS still
points at a parking page, certificate issuance fails (and repeated failures hit
rate limits).

At the registrar, delete parking / URL-redirect records. A fresh Namecheap domain
often has:

- apex `A` → `192.64.119.221` (parking)
- `www` `CNAME` → `parkingpage.namecheap.com`

Those must go. Create:


| Type | Host      | Value    | TTL |
| ---- | --------- | -------- | --- |
| `A`  | `@`       | `VPS_IP` | 300 |
| `A`  | `www`     | `VPS_IP` | 300 |
| `A`  | `surveys` | `VPS_IP` | 300 |


Leave Namecheap nameservers (`pdns1.registrar-servers.com` / `pdns2`) as they
are unless you intentionally move DNS. MX/TXT for email forwarding can stay.

`CNAME` of `www` / `surveys` to the apex is also valid; the apex itself must remain
an `A` record. If the VPS has IPv6, add matching `AAAA` records.

From the **laptop**:

```bash
dig +short rescopesurveys.com
dig +short www.rescopesurveys.com
dig +short surveys.rescopesurveys.com
```

All three must print `VPS_IP` — not a parking address, not empty. Propagation
can take a few minutes at TTL 300.

On the VPS, after the files are in place (step 5):

```bash
./scripts/deploy/check-dns.sh
```

---



## 4. Publish images (laptop, once per release)

Hub repositories: `vitomirov/rescopesurveys-api` and `vitomirov/rescopesurveys-web`.
They are public — the VPS does not need `docker login`.

Prefer a version tag so rollback is one command. From the **laptop**, in this repo:

```bash
docker login
./scripts/deploy/publish-docker.sh v0.1.0
```

GitHub Actions can also publish on `v*.*.*` tags — see [CI.md](CI.md). If you
deploy `:latest` because no tag exists yet, set `IMAGE_TAG=latest` when you
create `.env`. Rollback then is not a one-liner.

---



## 5. First deploy (terminal only from here)



### 5.1 Copy files — laptop

Do **not** copy your local `.env` (dev passwords). Do **not** clone the whole
repo unless the VPS has GitHub SSH access; the VPS only needs compose files,
scripts, and the Caddyfile. Images come from Docker Hub.

From the repo root on the **laptop**:

```bash
./scripts/deploy/sync-to-vps.sh root@VPS_IP
```

Use `rescope@VPS_IP` if you created a sudo user. Default remote directory is
`/opt/rescopesurveys`.

This copies:

- `docker-compose.yml`
- `docker-compose.prod.yml`
- `scripts/deploy/*.sh`
- `docker/caddy/Caddyfile`



### 5.2 SSH to the VPS

```bash
ssh root@VPS_IP
cd /opt/rescopesurveys
```

Confirm the files landed:

```bash
ls -l docker-compose.yml docker-compose.prod.yml docker/caddy/Caddyfile scripts/deploy
```



### 5.3 Install Docker, Caddy, firewall — VPS

```bash
sudo ./scripts/deploy/bootstrap-vps.sh
```

Idempotent. It will:

1. Install Docker Engine + Compose plugin (needs **Compose v2.24+** for `!override`).
2. Add your user to the `docker` group (if you are not root).
3. Install Caddy from the official apt repo.
4. Copy `docker/caddy/Caddyfile` → `/etc/caddy/Caddyfile` and `caddy validate`.
5. Reload Caddy **only if** `check-dns.sh` passes; otherwise it tells you to wait.
6. Enable ufw: allow `22`, `80`, `443`; deny everything else.

If you are not root and it added you to `docker`, either `exit` and SSH again or:

```bash
newgrp docker
cd /opt/rescopesurveys
```

Flags: `--skip-caddyfile` (keep a hand-edited `/etc/caddy/Caddyfile`), `--skip-ufw`.

### 5.4 Create `.env` — VPS (do not type secrets by hand)

```bash
cd /opt/rescopesurveys
IMAGE_TAG=v0.1.0 ./scripts/deploy/init-env.sh
```

Omit `IMAGE_TAG=...` only if you must run `:latest`. The script:

- writes `/opt/rescopesurveys/.env` with `openssl` secrets
- sets `chmod 600`
- sets `COMPOSE_FILE=docker-compose.yml:docker-compose.prod.yml` so every
`docker compose` command includes the production override
- **refuses to overwrite** an existing `.env` (Postgres keeps the password from
the first start; changing `POSTGRES_PASSWORD` later does **not** update the
role inside the volume)

It prints key **names** and JWT length, never the secret values.

Store `POSTGRES_PASSWORD` somewhere off the VPS. Do not commit `.env`. Do not
paste it into chat or GitHub issues.

To inspect keys without printing values:

```bash
grep -E '^[A-Z_]+=' /opt/rescopesurveys/.env | cut -d= -f1
```

Do not change `POSTGRES_USER` or `POSTGRES_DB` — the Compose healthcheck is
hardcoded to `rescopesurveys`.


| Variable            | Role                                                                 |
| ------------------- | -------------------------------------------------------------------- |
| `POSTGRES_PASSWORD` | Required. Interpolated into `DATABASE_URL`. Never `rescopesurveys`.  |
| `JWT_SECRET`        | Required, 32+ characters. Production sets `REQUIRE_STRONG_JWT=true`. |
| `CORS_ORIGIN`       | Required allowlist. Never `true` or `*`.                             |
| `DOCKERHUB_USER`    | Hub account (`vitomirov`).                                           |
| `IMAGE_TAG`         | Deployed version. Semver (`v0.1.0`) for rollback.                    |
| `WEB_HOST_PORT`     | Bare port (`8080`). Must match `127.0.0.1:8080` in the Caddyfile.    |
| `COMPOSE_FILE`      | VPS only. Makes `docker compose` load `docker-compose.prod.yml`.     |


Caddy domains are **not** in `.env`. They live in `/etc/caddy/Caddyfile`.

#### Editing `.env` later (`nano`)

Only needed to change a value the scripts do not already take as an argument.
`deploy.sh v0.1.1` updates `IMAGE_TAG` for you.

```bash
nano /opt/rescopesurveys/.env
```

- Save: `Ctrl+O`, then `Enter`
- Quit: `Ctrl+X`
- Paste in GNOME Terminal: `Ctrl+Shift+V`

Rules: no spaces around `=`, no quotes, no spaces after commas in `CORS_ORIGIN`.

### 5.5 Start the stack — VPS

```bash
cd /opt/rescopesurveys
./scripts/deploy/deploy.sh
```

Validates secrets (no placeholders, JWT length), pulls Hub images, `up -d`,
waits up to 60s for `http://127.0.0.1:8080/health`. Prisma migrations run on
API startup; the first boot is slower.

Then:

```bash
./scripts/deploy/verify.sh
```

`verify.sh` checks `.env`, Compose version, `/health`, that port 8080 is
**127.0.0.1** (not `0.0.0.0`), Caddy active, and public HTTPS when DNS is ready.

Port 8080 must never be public. ufw does **not** filter Docker-published ports
(Docker inserts iptables rules that bypass ufw). The loopback bind in
`docker-compose.prod.yml` is the real control. `COMPOSE_FILE` in `.env` is what
makes `docker compose` apply that override.

Do not log in over plain HTTP. `COOKIE_SECURE=true` in the prod override means
browsers drop the session cookie without HTTPS.

### 5.6 Nightly database dump — VPS

```bash
./scripts/deploy/backup.sh --install-cron
```

Writes `/opt/backups/rescopesurveys-YYYY-MM-DD-HHMM.sql.gz`, keeps 14 days,
cron at 03:00. Copy dumps **off** the VPS (`scp` to the laptop or object
storage). A file that exists only on the machine that died is not a backup.

One-off dump: `./scripts/deploy/backup.sh`

---



## 6. Browser checks after TLS


| #   | Check                                                            | Expected                                                                            |
| --- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 1   | `curl -sI https://rescopesurveys.com`                            | `200`, valid cert, `x-content-type-options: nosniff`, `x-frame-options: SAMEORIGIN` |
| 2   | `curl https://rescopesurveys.com/health`                         | `{"status":"ok",...}`                                                               |
| 3   | Open `https://rescopesurveys.com`                                | SPA, login / signup                                                                 |
| 4   | Sign up the first account                                        | Org + dashboard. **No** `admin` / `admin123`                                        |
| 5   | Reload after signup                                              | Still logged in — this is the HTTPS/cookie check                                    |
| 6   | `curl -I https://www.rescopesurveys.com`                         | `200` (or `301` if you enabled the www→apex redirect in the Caddyfile)              |
| 7   | `curl -I https://surveys.rescopesurveys.com/test-path`           | `200` SPA shell; in-app “survey not found” is OK                                    |
| 8   | Publish a survey, open `surveys.rescopesurveys.com/<publicPath>` | Survey accepts a response                                                           |
| 9   | `curl -I http://rescopesurveys.com`                              | `308` / `301` to HTTPS                                                              |
| 10  | `docker compose ps` in `/opt/rescopesurveys`                     | All three `Up`; api and postgres `healthy`                                          |


From the laptop, these must **fail**:

```bash
curl --max-time 5 http://rescopesurveys.com:8080/
nc -zv rescopesurveys.com 5432
```

---



## 7. Updates and rollback

Laptop:

```bash
docker login
./scripts/deploy/publish-docker.sh v0.1.1
```

If compose files or scripts changed, also:

```bash
./scripts/deploy/sync-to-vps.sh root@VPS_IP
```

VPS:

```bash
cd /opt/rescopesurveys
./scripts/deploy/deploy.sh v0.1.1
```

(`v0.1.1` writes `IMAGE_TAG` then pulls/restarts. Caddy is not reloaded unless
you changed domains.)

Rollback:

```bash
./scripts/deploy/deploy.sh v0.1.0
```

Image rollback does **not** undo Prisma migrations. If a release had a
destructive migration, restore a dump first (step 8) then start the old image.

---



## 8. Restore a dump

```bash
cd /opt/rescopesurveys
gunzip -c /opt/backups/rescopesurveys-2026-01-31-0300.sql.gz \
  | docker compose exec -T postgres psql -U rescopesurveys -d rescopesurveys
```

(`COMPOSE_FILE` in `.env` already includes the prod override.)

---



## 9. Troubleshooting

**Certificate errors / Caddy cannot issue a certificate**

```bash
./scripts/deploy/check-dns.sh
sudo journalctl -u caddy -n 100 --no-pager
```

Usual causes: parking DNS still in place, `surveys` has no A record, port 80
held by nginx/apache (`ss -tlnp | grep :80`), Let's Encrypt rate limit after
repeated failures (wait an hour, or staging CA:
`acme_ca https://acme-staging-v02.api.letsencrypt.org/directory`).

**502 Bad Gateway from Caddy**

```bash
docker compose ps
curl http://127.0.0.1:8080/health
sudo ss -tlnp | grep 8080
docker compose logs --tail 50 web api
```

`WEB_HOST_PORT` in `.env` must match `127.0.0.1:8080` in `/etc/caddy/Caddyfile`.

**Login works then session dies on reload**

You are on HTTP or the cert is invalid. Production sets `COOKIE_SECURE=true`
in `docker-compose.prod.yml`. Do not turn that off.

**API restart loop**

```bash
docker compose logs --tail 100 api
```

Weak/placeholder `JWT_SECRET`, or `POSTGRES_PASSWORD` that does not match the
password stored in `pgdata` from the first `up`.

`docker compose up`**: port already allocated**

Compose v2.24+ is required so `ports: !override` **replaces** the public bind.
Older Compose **appends** and you get both `0.0.0.0:8080` and `127.0.0.1:8080`.
`bootstrap-vps.sh` refuses Compose older than 2.24. Fallback if you cannot
upgrade: remove `docker-compose.prod.yml`, drop `COMPOSE_FILE` from `.env`, set
`WEB_HOST_PORT=127.0.0.1:8080`.

`surveys.rescopesurveys.com/<path>` **shows the dashboard**

Hostname must be exactly `surveys.rescopesurveys.com`, and the survey must be
`live` with that `publicPath`.
`curl https://surveys.rescopesurveys.com/api/public/surveys/<path>`

`permission denied` **talking to Docker**

After bootstrap as a non-root user: `newgrp docker` or SSH out and back in.

**Site unreachable**

Outside in: `./scripts/deploy/check-dns.sh` → `sudo ufw status` →
`systemctl status caddy` → `docker compose ps` →
`curl http://127.0.0.1:8080/health`.

---



## 10. Script index

All paths relative to `/opt/rescopesurveys` on the VPS, except `sync-to-vps.sh`
and `publish-docker.sh` (laptop, repo root).


| Script                                      | Where  | What it does                                                  |
| ------------------------------------------- | ------ | ------------------------------------------------------------- |
| `scripts/deploy/publish-docker.sh v0.1.0`   | Laptop | Build and push API + web images                               |
| `scripts/deploy/sync-to-vps.sh user@IP`     | Laptop | Copy compose files, scripts, Caddyfile. Never copies `.env`   |
| `scripts/deploy/bootstrap-vps.sh`           | VPS    | Docker, Caddy, ufw, install Caddyfile, reload if DNS is ready |
| `scripts/deploy/init-env.sh`                | VPS    | Generate production `.env` (no overwrite)                     |
| `scripts/deploy/check-dns.sh`               | VPS    | Apex / www / surveys A records = this IPv4                    |
| `scripts/deploy/deploy.sh [tag]`            | VPS    | Validate `.env`, pull, up, wait for `/health`                 |
| `scripts/deploy/verify.sh`                  | VPS    | Loopback bind, health, Caddy, public HTTPS if DNS is ready    |
| `scripts/deploy/backup.sh [--install-cron]` | VPS    | `pg_dump` to `/opt/backups`, optional nightly cron            |


---



## Appendix A — `.env` shape (generated; do not copy secrets from here)

`init-env.sh` writes this shape. Shown so you can recognize a broken file.

```
POSTGRES_USER=rescopesurveys
POSTGRES_DB=rescopesurveys
POSTGRES_PASSWORD=<openssl rand -base64 24>

JWT_SECRET=<openssl rand -base64 48>

CORS_ORIGIN=https://rescopesurveys.com,https://www.rescopesurveys.com,https://surveys.rescopesurveys.com

DOCKERHUB_USER=vitomirov
IMAGE_TAG=v0.1.0

WEB_HOST_PORT=8080
COMPOSE_FILE=docker-compose.yml:docker-compose.prod.yml
```

---



## Appendix B — manual install if a script cannot run

Use this only if `bootstrap-vps.sh` fails. Prefer fixing the script error.

**Docker** (Compose must report v2.24+ via `docker compose version`):

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

**Caddy:**

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
sudo cp /opt/rescopesurveys/docker/caddy/Caddyfile /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl enable --now caddy
```

Optional ACME expiry email — add at the top of `/etc/caddy/Caddyfile`:

```
{
	email ops@rescopesurveys.com
}
```

**ufw:**

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

Never allow 8080 or 5432.

---



## Quick reference


| Task                | Command                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| First VPS setup     | `sudo ./scripts/deploy/bootstrap-vps.sh` then `IMAGE_TAG=v0.1.0 ./scripts/deploy/init-env.sh` then `./scripts/deploy/deploy.sh` |
| Deploy / update     | `./scripts/deploy/deploy.sh v0.1.1`                                                                                             |
| Status              | `docker compose ps`                                                                                                             |
| Logs                | `docker compose logs -f api`                                                                                                    |
| Health / bind / TLS | `./scripts/deploy/verify.sh`                                                                                                    |
| DNS                 | `./scripts/deploy/check-dns.sh`                                                                                                 |
| Restart app         | `docker compose restart api web`                                                                                                |
| Stop stack          | `docker compose down` (data stays in `pgdata`)                                                                                  |
| Reload Caddy        | `sudo systemctl reload caddy`                                                                                                   |
| Backup now          | `./scripts/deploy/backup.sh`                                                                                                    |


