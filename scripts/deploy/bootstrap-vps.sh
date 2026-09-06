#!/usr/bin/env bash
# First-time VPS setup: Docker, Caddy, firewall, Caddyfile.
# Idempotent — safe to re-run. Does not start the app stack (use deploy.sh).
# Does not overwrite /etc/caddy/Caddyfile if you pass --skip-caddyfile.
#
# Usage (on the VPS, from /opt/rescopesurveys):
#   sudo ./scripts/deploy/bootstrap-vps.sh
#
# Full guide: docs/DEPLOY.md

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

cd "$ROOT"

export DEBIAN_FRONTEND=noninteractive

SKIP_CADDYFILE=0
SKIP_UFW=0
for arg in "$@"; do
  case "$arg" in
    --skip-caddyfile) SKIP_CADDYFILE=1 ;;
    --skip-ufw) SKIP_UFW=1 ;;
    *) fail "Unknown argument: $arg" ;;
  esac
done

if [[ ! -f /etc/os-release ]] || ! grep -q '^ID=ubuntu' /etc/os-release; then
  echo "WARNING: this script is written for Ubuntu 22.04/24.04."
fi

install_docker() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    echo "==> Docker already installed"
    return 0
  fi

  echo "==> Installing Docker Engine + Compose plugin"
  sudo_cmd apt-get update
  sudo_cmd apt-get install -y ca-certificates curl gnupg
  sudo_cmd install -m 0755 -d /etc/apt/keyrings
  if [[ ! -f /etc/apt/keyrings/docker.gpg ]]; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
      | sudo_cmd gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  fi
  local codename
  # shellcheck disable=SC1091
  codename="$(. /etc/os-release && echo "$VERSION_CODENAME")"
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu ${codename} stable" \
    | sudo_cmd tee /etc/apt/sources.list.d/docker.list >/dev/null
  sudo_cmd apt-get update
  sudo_cmd apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
}

add_docker_group() {
  local user="${SUDO_USER:-$USER}"
  if [[ "$user" == "root" ]]; then
    return 0
  fi
  if id -nG "$user" | grep -qw docker; then
    echo "==> $user is already in the docker group"
    return 0
  fi
  echo "==> Adding $user to the docker group"
  sudo_cmd usermod -aG docker "$user"
  echo "    Log out and SSH back in (or run: newgrp docker) before ./scripts/deploy/deploy.sh"
}

check_compose_version() {
  local ver
  ver="$(compose_version_short)"
  [[ -n "$ver" ]] || fail "docker compose is installed but version could not be parsed"
  if ! version_gte "$ver" "$MIN_COMPOSE_VERSION"; then
    fail "Docker Compose $ver is older than $MIN_COMPOSE_VERSION. docker-compose.prod.yml uses !override."
  fi
  echo "==> Docker Compose $ver"
}

install_caddy() {
  if command -v caddy >/dev/null 2>&1; then
    echo "==> Caddy already installed"
    return 0
  fi
  echo "==> Installing Caddy"
  sudo_cmd apt-get update
  sudo_cmd apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | sudo_cmd gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    | sudo_cmd tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  sudo_cmd apt-get update
  sudo_cmd apt-get install -y caddy
}

assert_port_80_free_or_caddy() {
  local holders
  holders="$(ss -tlnp 2>/dev/null | grep ':80 ' || true)"
  if [[ -z "$holders" ]]; then
    return 0
  fi
  if printf '%s\n' "$holders" | grep -qi caddy; then
    return 0
  fi
  echo "$holders"
  fail "Port 80 is in use by something other than Caddy. Remove nginx/apache (apt-get remove nginx apache2) so Let's Encrypt can bind :80."
}

install_caddyfile() {
  local src="$ROOT/docker/caddy/Caddyfile"
  [[ -f "$src" ]] || fail "Missing $src — sync deploy files first (./scripts/deploy/sync-to-vps.sh)"
  echo "==> Installing /etc/caddy/Caddyfile"
  sudo_cmd cp "$src" /etc/caddy/Caddyfile
  sudo_cmd caddy validate --config /etc/caddy/Caddyfile
  sudo_cmd systemctl enable caddy
}

reload_caddy_if_dns_ready() {
  echo "==> Checking DNS before reloading Caddy"
  if "$SCRIPT_DIR/check-dns.sh"; then
    sudo_cmd systemctl reload caddy || sudo_cmd systemctl restart caddy
    sudo_cmd systemctl status caddy --no-pager || true
    echo "==> Caddy reloaded. Watch certificates with: sudo journalctl -u caddy -f"
  else
    echo ""
    echo "Caddyfile is installed but Caddy was NOT reloaded — DNS is not pointing here yet."
    echo "After A records for app, rescopesurveys.com, www, and surveys all show this VPS IP:"
    echo "  ./scripts/deploy/check-dns.sh"
    echo "  sudo systemctl reload caddy"
  fi
}

configure_ufw() {
  echo "==> Configuring ufw (22, 80, 443 only)"
  sudo_cmd apt-get install -y ufw
  sudo_cmd ufw default deny incoming
  sudo_cmd ufw default allow outgoing
  sudo_cmd ufw allow 22/tcp
  sudo_cmd ufw allow 80/tcp
  sudo_cmd ufw allow 443/tcp
  sudo_cmd ufw --force enable
  sudo_cmd ufw status verbose
}

echo "==> Bootstrapping VPS from $ROOT"

install_docker
add_docker_group
check_compose_version
install_caddy
assert_port_80_free_or_caddy

if [[ "$SKIP_CADDYFILE" -eq 0 ]]; then
  install_caddyfile
  reload_caddy_if_dns_ready
else
  echo "==> Skipping Caddyfile install (--skip-caddyfile)"
fi

if [[ "$SKIP_UFW" -eq 0 ]]; then
  configure_ufw
else
  echo "==> Skipping ufw (--skip-ufw)"
fi

echo ""
echo "Bootstrap finished."
echo "Next:"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "  ./scripts/deploy/init-env.sh          # write .env with generated secrets"
else
  echo "  .env already exists — leaving it unchanged"
fi
echo "  ./scripts/deploy/deploy.sh             # pull images and start postgres/api/web"
echo "  ./scripts/deploy/verify.sh"
echo "  ./scripts/deploy/backup.sh --install-cron"
