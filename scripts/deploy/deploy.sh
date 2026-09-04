#!/usr/bin/env bash
# Redeploy Rescope Surveys on the VPS: validate secrets, pull images, restart
# the stack, wait for /health.
#
# Usage:
#   ./scripts/deploy/deploy.sh           # use IMAGE_TAG already in .env
#   ./scripts/deploy/deploy.sh v0.1.1    # write IMAGE_TAG then deploy
#
# Secrets stay in .env on the server — this script never prints them.
#
# Full guide: docs/DEPLOY.md

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

cd "$ROOT"

HEALTH_TIMEOUT=60
NEW_TAG="${1:-}"

validate_production_env

if [[ -n "$NEW_TAG" ]]; then
  [[ "$NEW_TAG" != -* ]] || fail "Usage: ./scripts/deploy/deploy.sh [IMAGE_TAG]"
  echo "Setting IMAGE_TAG=$NEW_TAG in .env"
  set_env_value IMAGE_TAG "$NEW_TAG"
fi

image_tag="$(env_value IMAGE_TAG)"
echo "Deploying Rescope Surveys (IMAGE_TAG=${image_tag:-latest})"

echo "==> Pulling images"
compose_cmd pull

echo "==> Starting stack"
compose_cmd up -d

health_url="$(web_health_url)"
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
compose_cmd ps

if (( healthy == 0 )); then
  echo ""
  echo "Recent api logs:" >&2
  compose_cmd logs --tail 40 api >&2 || true
  fail "Health check failed after ${HEALTH_TIMEOUT}s. The previous images are still on disk — roll back with: ./scripts/deploy/deploy.sh <last-good-tag>"
fi

echo ""
echo "Health check passed: ${health_url}"
echo ""
echo "Next steps:"
echo "  1. ./scripts/deploy/verify.sh"
echo "  2. Confirm Caddy:  sudo systemctl status caddy"
echo "  3. Open https://rescopesurveys.com and sign up (no seeded admin in production)"
echo "  4. Open a live survey on https://surveys.rescopesurveys.com/<publicPath>"
echo ""
echo "Troubleshooting: docs/DEPLOY.md"
