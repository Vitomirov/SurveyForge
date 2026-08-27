#!/usr/bin/env bash
# Start Postgres for local npm dev (host port 5433).
# Uses the system Docker engine (not Docker Desktop) and docker-compose.dev.yml.
#
# Usage:
#   ./scripts/dev/start-postgres.sh          # start postgres
#   ./scripts/dev/start-postgres.sh --reset  # wipe DB volume and start fresh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

# This project binds host ports; use the system Docker engine, not Docker Desktop.
DOCKER_CONTEXT="${DOCKER_CONTEXT:-default}"
DOCKER=(docker --context "${DOCKER_CONTEXT}")
COMPOSE=("${DOCKER[@]}" compose -f docker-compose.yml -f docker-compose.dev.yml)

if [[ "${1:-}" == "--reset" ]]; then
  echo "Stopping postgres and removing database volume..."
  "${COMPOSE[@]}" down -v --remove-orphans
  echo "Database volume removed."
fi

echo "Starting postgres on localhost:${POSTGRES_HOST_PORT:-5433}..."
"${COMPOSE[@]}" up postgres -d

echo ""
echo "Connection (DBeaver / .env):"
PG_USER="${POSTGRES_USER:-rescopesurveys}"
PG_PASS="${POSTGRES_PASSWORD:-rescopesurveys}"
PG_DB="${POSTGRES_DB:-rescopesurveys}"
PG_PORT="${POSTGRES_HOST_PORT:-5433}"
echo "  postgresql://${PG_USER}:${PG_PASS}@localhost:${PG_PORT}/${PG_DB}"
