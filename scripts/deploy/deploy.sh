#!/usr/bin/env bash
# Redeploy Rescope Surveys on the VPS: validate secrets, pull images, restart
# the stack, wait for /health.
#
# Usage:
#   ./scripts/deploy/deploy.sh
#
# Change the deployed version by editing IMAGE_TAG in .env, then re-running.
# Secrets stay in .env on the server — this script never writes, commits, or
# prints them.
#
# Full guide: docs/DEPLOY.md

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

ENV_FILE="$ROOT/.env"
HEALTH_TIMEOUT=60

COMPOSE=(docker compose -f docker-compose.yml)
if [[ -f docker-compose.prod.yml ]]; then
  COMPOSE+=(-f docker-compose.prod.yml)
fi

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

# Last assignment wins, matching how Compose reads .env. Quotes are stripped.
env_value() {
  sed -n "s/^[[:space:]]*$1[[:space:]]*=//p" "$ENV_FILE" \
    | tail -n 1 \
    | sed -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'\$/\1/"
}

[[ -f "$ENV_FILE" ]] || fail ".env not found in $ROOT — create it from .env.example and set production secrets (docs/DEPLOY.md)."

jwt_secret="$(env_value JWT_SECRET)"
postgres_password="$(env_value POSTGRES_PASSWORD)"

[[ -n "$jwt_secret" ]] || fail "JWT_SECRET is missing or empty in .env — generate one with: openssl rand -base64 48"
(( ${#jwt_secret} >= 32 )) || fail "JWT_SECRET is shorter than 32 characters — the API refuses weak secrets in production."
case "$jwt_secret" in
  *change-me*|*dev-secret*|*load-test-secret*|*not-for-production*|*example*)
    fail "JWT_SECRET still contains a placeholder value — generate one with: openssl rand -base64 48"
    ;;
esac

[[ -n "$postgres_password" ]] || fail "POSTGRES_PASSWORD is missing or empty in .env — generate one with: openssl rand -base64 24"
case "$postgres_password" in
  rescopesurveys|postgres|password|*change-me*|*example*)
    fail "POSTGRES_PASSWORD is a default or placeholder value — generate one with: openssl rand -base64 24"
    ;;
esac

cors_origin="$(env_value CORS_ORIGIN)"
if [[ -n "$cors_origin" ]]; then
  case "$cors_origin" in
    true|TRUE|'*'|reflect)
      fail "CORS_ORIGIN must be an explicit origin allowlist — not true, *, or reflect"
      ;;
  esac
fi

# WEB_HOST_PORT may carry a bind address (127.0.0.1:8080); keep the port only.
web_host_port="$(env_value WEB_HOST_PORT)"
health_port="${web_host_port:-8080}"
health_port="${health_port##*:}"
health_url="http://127.0.0.1:${health_port}/health"

image_tag="$(env_value IMAGE_TAG)"
echo "Deploying Rescope Surveys (IMAGE_TAG=${image_tag:-latest})"

echo "==> Pulling images"
"${COMPOSE[@]}" pull

echo "==> Starting stack"
"${COMPOSE[@]}" up -d

echo "==> Waiting for ${health_url} (max ${HEALTH_TIMEOUT}s)"
deadline=$((SECONDS + HEALTH_TIMEOUT))
healthy=0
while (( SECONDS < deadline )); do
  if curl -fsS --max-time 3 "$health_url" >/dev/null 2>&1; then
    healthy=1
    break
  fi
  sleep 2
done

echo ""
"${COMPOSE[@]}" ps

if (( healthy == 0 )); then
  echo ""
  echo "Recent api logs:" >&2
  "${COMPOSE[@]}" logs --tail 40 api >&2 || true
  fail "Health check failed after ${HEALTH_TIMEOUT}s. The previous images are still on disk — roll back by setting IMAGE_TAG to the last good tag in .env and re-running this script."
fi

echo ""
echo "Health check passed: ${health_url}"
echo ""
echo "Next steps:"
echo "  1. Confirm Caddy is running:  systemctl status caddy"
echo "  2. Open https://rescopesurveys.com and log in"
echo "  3. Open a live survey link on https://surveys.rescopesurveys.com/<publicPath>"
echo ""
echo "Troubleshooting: docs/DEPLOY.md"
