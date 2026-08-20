# VPS deploy prompt — Caddy on host, nginx stays in Docker

Copy **the entire fenced block below** into a new Cursor chat and send it as your first message.

```
Task: prepare production deploy documentation and helper files for Rescope Surveys.
Caddy ONLY on the VPS host for HTTPS and domain routing; the inner nginx in the Docker web container MUST remain untouched.

## Project context

Repository: survey-builder (Rescope Surveys)

- Stack: Postgres + Fastify API + React/Vite (nginx in the web container)
- Prod compose: docker-compose.yml (postgres, api, web)
- Dev override: docker-compose.dev.yml — DO NOT MODIFY
- Load test: docker-compose.load.yml — DO NOT MODIFY
- Domain: rescopesurveys.com
- Public survey URLs: surveys.rescopesurveys.com/{publicPath}
- Docker Hub: vitomirov/rescopesurveys-api, vitomirov/rescopesurveys-web
- Prod env: JWT_SECRET (32+ chars), POSTGRES_PASSWORD (strong password), COOKIE_SECURE=true in compose

Current architecture (DO NOT change the inner layer):

    Internet
      → Caddy (VPS host, port 443)          ← ADD THIS
      → localhost:8080 (WEB_HOST_PORT)
      → nginx (web container, port 80)      ← KEEP AS-IS
           ├── /      → React static build
           └── /api/  → api:3003
      → postgres (pgdata volume, NOT exposed on host)

## What to implement (scope)

### 1. Create docs/DEPLOY.md — main deployment guide (English)

Clear, step-by-step guide for someone deploying for the first time. Structure:

1. Architecture overview — ASCII diagram (host Caddy + Docker stack), explain why two layers exist
2. Prerequisites — VPS (Ubuntu 22.04/24.04), domain, Docker + Compose, firewall
3. DNS setup — exact A/CNAME records:
   - rescopesurveys.com → VPS IP
   - www.rescopesurveys.com → VPS IP (or CNAME to apex)
   - surveys.rescopesurveys.com → VPS IP (or CNAME)
4. Secrets (.env on VPS) — what MUST be set, what NEVER to commit:
   - POSTGRES_PASSWORD (openssl rand -base64 24)
   - JWT_SECRET (32+ characters)
   - DOCKERHUB_USER, IMAGE_TAG (prefer semver tags, not only latest)
   - WEB_HOST_PORT=8080 (internal only, not public)
   - Note: first user is created via signup (no seeded accounts in prod)
5. First VPS deploy — commands in order:
   - install Docker
   - clone / copy files (docker-compose.yml + .env)
   - docker compose pull && docker compose up -d
   - verify: curl http://127.0.0.1:8080/health
6. Caddy on host — install and config:
   - docker/caddy/Caddyfile as a template in the repo
   - instructions: apt install caddy, copy Caddyfile, systemctl enable/restart
   - reverse_proxy to 127.0.0.1:8080
   - all domains: rescopesurveys.com, www.rescopesurveys.com, surveys.rescopesurveys.com
   - automatic HTTPS (Let's Encrypt)
   - note: COOKIE_SECURE=true requires HTTPS — auth will not work without Caddy/TLS
7. Firewall (ufw) — only 22, 80, 443 open; 8080 and 5432 CLOSED publicly
8. Post-deploy verification — checklist:
   - https://rescopesurveys.com loads the app
   - signup/login works (cookies)
   - https://surveys.rescopesurveys.com/test-path (404 is OK; SPA must respond)
   - curl https://rescopesurveys.com/health
9. Updates (redeploy) — docker compose pull && docker compose up -d
10. Rollback — IMAGE_TAG=v0.x.x in .env, pull, up -d
11. Postgres backup — docker compose exec postgres pg_dump ... (short example command)
12. Troubleshooting — common issues (DNS propagation, cert errors, 502, auth broken without HTTPS)

### 2. Create docker/caddy/Caddyfile — template in the repo

Minimal production config:

    rescopesurveys.com, www.rescopesurveys.com, surveys.rescopesurveys.com {
        reverse_proxy 127.0.0.1:8080
    }

No hardcoded email addresses unless Caddy requires them for Let's Encrypt (global options block only if needed).
Short comments in English inside the file.

### 3. Create scripts/deploy.sh — safe redeploy script

- set -euo pipefail
- verify .env exists and JWT_SECRET / POSTGRES_PASSWORD are not empty or placeholders
- docker compose pull
- docker compose up -d
- wait for health (curl http://127.0.0.1:${WEB_HOST_PORT:-8080}/health, max 60s)
- print status and next steps
- do NOT commit secrets, do NOT push to remote

### 4. Update README.md — "Production deployment" section

- Add link to docs/DEPLOY.md
- Briefly explain the two layers (host Caddy + Docker nginx)
- Update the topology diagram
- Do NOT rewrite the entire README — only extend the existing section

### 5. Update .env.example

Add comments for production VPS deploy:
- WEB_HOST_PORT (internal port; Caddy proxies here)
- DOCKERHUB_USER / IMAGE_TAG
- note that Caddy is not in .env — it is configured on the host

## Out of scope — DO NOT change

- docker/nginx.conf — keep
- Dockerfile (web) — keep nginx
- docker-compose.dev.yml — keep
- docker-compose.load.yml — keep
- server/src/** — no backend changes
- src/** — no frontend changes
- Do NOT add GitHub Actions in this task (docs + script only; CI/CD can come later)
- Do NOT refactor the compose stack to Caddy-in-Docker — explicitly out of scope
- Do NOT commit .env

## Security (must be documented)

- Postgres must never be publicly exposed
- WEB_HOST_PORT (8080) must bind to 127.0.0.1 only — in DEPLOY.md explain that Caddy proxies to localhost, not 0.0.0.0:8080 on the public internet
  (If docker-compose currently maps 0.0.0.0:8080, recommend binding to 127.0.0.1:8080:80 in compose OR blocking 8080 via firewall — pick one approach and document it; prefer 127.0.0.1 bind in docker-compose.yml only if it is a minimal change and does not break local dev — if compose must change, use docker-compose.prod.yml override instead of modifying the base compose file)
- JWT_SECRET and POSTGRES_PASSWORD must never be in git
- COOKIE_SECURE=true is already set in prod compose — emphasize HTTPS requirement
- First admin account: signup, not default credentials

## Risk / approach

- Minimal diff — documentation + Caddyfile template + deploy script
- Do not break the existing dev workflow
- DEPLOY.md in English; code and file comments in English (match the rest of the repo)
- At the end of the session: short summary of what was created, how the deploy flow works, and an exact checklist of what the user must do manually on the VPS before and after

## Expected deploy flow (what the documentation should describe)

    [Local]
      1. Generate secrets → .env on VPS
      2. ./scripts/publish-docker.sh v0.1.0
      3. Push code / copy compose + .env to VPS

    [VPS — first time]
      4. DNS → VPS IP (3 domains)
      5. apt install docker, caddy
      6. ufw allow 22,80,443
      7. docker compose pull && docker compose up -d
      8. copy Caddyfile → /etc/caddy/Caddyfile
      9. systemctl reload caddy
      10. Verification (signup, health, surveys subdomain)

    [VPS — every update]
      ./scripts/deploy.sh
      # or: IMAGE_TAG=v0.1.1 in .env && docker compose pull && docker compose up -d

Implement everything above, verify README links work, and at the end explain in English what you did, how deployment works, and what I must do manually on the VPS.
```

---

## Notes before you send the prompt

1. Replace the placeholder password in `.env` before production:

   ```bash
   openssl rand -base64 24   # POSTGRES_PASSWORD
   ```

2. Publish Docker images before the first VPS deploy:

   ```bash
   docker login
   ./scripts/publish-docker.sh v0.1.0
   ```

3. DNS must be live before Caddy requests a Let's Encrypt certificate.

4. This prompt does not change the Docker stack — only docs, Caddyfile template, and deploy script.
