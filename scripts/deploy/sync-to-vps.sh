#!/usr/bin/env bash
# Copy deploy files from this laptop to the VPS. Does not copy .env.
#
# Usage (on your laptop, from the repo root):
#   ./scripts/deploy/sync-to-vps.sh user@VPS_IP
#   ./scripts/deploy/sync-to-vps.sh user@VPS_IP /opt/rescopesurveys
#
# Full guide: docs/DEPLOY.md

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

cd "$ROOT"

TARGET="${1:-}"
REMOTE_DIR="${2:-/opt/rescopesurveys}"

[[ -n "$TARGET" ]] || fail "Usage: ./scripts/deploy/sync-to-vps.sh user@VPS_IP [/opt/rescopesurveys]"

need_cmd ssh
need_cmd scp

[[ -f "$ROOT/docker-compose.yml" ]] || fail "docker-compose.yml not found — run this from the repo (or via this script path)"
[[ -f "$ROOT/docker-compose.prod.yml" ]] || fail "docker-compose.prod.yml not found"
[[ -f "$ROOT/docker/caddy/Caddyfile" ]] || fail "docker/caddy/Caddyfile not found"

echo "==> Ensuring remote directories on $TARGET:$REMOTE_DIR"
# Create as the SSH user when possible; fall back to sudo (password prompt uses -t).
ssh -t "$TARGET" "mkdir -p '$REMOTE_DIR/scripts/deploy' '$REMOTE_DIR/docker/caddy' 2>/dev/null || { sudo mkdir -p '$REMOTE_DIR/scripts/deploy' '$REMOTE_DIR/docker/caddy' && sudo chown -R \$(id -u):\$(id -g) '$REMOTE_DIR'; }"

echo "==> Copying compose files"
scp \
  "$ROOT/docker-compose.yml" \
  "$ROOT/docker-compose.prod.yml" \
  "$TARGET:$REMOTE_DIR/"

echo "==> Copying deploy scripts"
scp \
  "$ROOT/scripts/deploy/"*.sh \
  "$TARGET:$REMOTE_DIR/scripts/deploy/"

echo "==> Copying Caddyfile template"
scp \
  "$ROOT/docker/caddy/Caddyfile" \
  "$TARGET:$REMOTE_DIR/docker/caddy/"

echo "==> Making scripts executable"
# shellcheck disable=SC2029
ssh "$TARGET" "chmod +x '$REMOTE_DIR'/scripts/deploy/*.sh"

echo ""
echo "Copied deploy files to $TARGET:$REMOTE_DIR"
echo "Did not copy .env (create it on the VPS with init-env.sh)."
echo ""
echo "Next, on the VPS:"
echo "  ssh $TARGET"
echo "  cd $REMOTE_DIR"
echo "  sudo ./scripts/deploy/bootstrap-vps.sh"
echo "  ./scripts/deploy/init-env.sh"
echo "  ./scripts/deploy/deploy.sh"
