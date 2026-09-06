#!/usr/bin/env bash
# Check that the production stack is healthy on this VPS.
#
# Usage (on the VPS, from /opt/rescopesurveys):
#   ./scripts/deploy/verify.sh
#
# Full guide: docs/DEPLOY.md

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

cd "$ROOT"

failed=0
ok() { echo "OK    $*"; }
bad() { echo "FAIL  $*"; failed=1; }

need_cmd docker
need_cmd curl

if [[ ! -f "$ENV_FILE" ]]; then
  bad ".env is missing at $ENV_FILE"
else
  ok ".env exists (mode $(stat -c '%a' "$ENV_FILE" 2>/dev/null || echo '?'))"
  validate_production_env
  ok "production secrets look valid (values not printed)"
fi

if docker compose version >/dev/null 2>&1; then
  ver="$(compose_version_short)"
  if version_gte "${ver:-0}" "$MIN_COMPOSE_VERSION"; then
    ok "Docker Compose $ver (>= $MIN_COMPOSE_VERSION)"
  else
    bad "Docker Compose $ver is older than $MIN_COMPOSE_VERSION — docker-compose.prod.yml needs !override"
  fi
else
  bad "docker compose is not available"
fi

if compose_cmd ps >/dev/null 2>&1; then
  echo ""
  compose_cmd ps
  echo ""
else
  bad "docker compose ps failed — is the stack running?"
fi

health_url="$(web_health_url)"
if curl -fsS --max-time 5 "$health_url" >/dev/null 2>&1; then
  ok "health: $health_url"
else
  bad "health check failed: $health_url"
fi

port="$(env_value WEB_HOST_PORT)"
port="${port:-$DEFAULT_WEB_HOST_PORT}"
port="${port##*:}"
listen="$(ss -tlnp 2>/dev/null | grep ":${port} " || true)"
if printf '%s\n' "$listen" | grep -q '127.0.0.1'; then
  ok "port $port is bound to 127.0.0.1 (not public)"
elif printf '%s\n' "$listen" | grep -Eq '0.0.0.0|\*'; then
  bad "port $port is public (0.0.0.0). Use docker-compose.prod.yml / COMPOSE_FILE — ufw will not hide it."
elif [[ -z "$listen" ]]; then
  bad "nothing is listening on port $port"
else
  echo "INFO  listeners on $port:"
  echo "$listen"
fi

if command -v systemctl >/dev/null 2>&1; then
  if systemctl is-active --quiet caddy 2>/dev/null; then
    ok "caddy service is active"
  else
    bad "caddy service is not active — sudo systemctl status caddy"
  fi
fi

echo ""
echo "Public HTTPS (skipped if DNS is not ready):"
if "$SCRIPT_DIR/check-dns.sh" >/dev/null 2>&1; then
  for name in "${PRODUCTION_DOMAINS[@]}"; do
    code="$(curl -sI --max-time 15 "https://$name" | awk 'BEGIN{c=""} /^HTTP/{c=$2} END{print c}')"
    if [[ "$code" == "200" || "$code" == "301" || "$code" == "302" || "$code" == "308" ]]; then
      ok "https://$name -> HTTP $code"
    else
      bad "https://$name -> HTTP ${code:-timeout/error}"
    fi
  done
  http_code="$(curl -sI --max-time 10 http://rescopesurveys.com | awk 'BEGIN{c=""} /^HTTP/{c=$2} END{print c}')"
  if [[ "$http_code" == "301" || "$http_code" == "308" || "$http_code" == "302" ]]; then
    ok "http://rescopesurveys.com redirects to HTTPS ($http_code)"
  else
    bad "http://rescopesurveys.com should redirect to HTTPS (got ${http_code:-nothing})"
  fi
else
  echo "SKIP  public HTTPS — DNS does not yet point here. Run ./scripts/deploy/check-dns.sh"
fi

echo ""
if [[ "$failed" -ne 0 ]]; then
  fail "Verification failed. See docs/DEPLOY.md troubleshooting."
fi

echo "Verification passed."
echo "In a browser: open https://app.rescopesurveys.com, sign up, then reload — you must stay logged in."
