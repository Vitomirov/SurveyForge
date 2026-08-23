#!/usr/bin/env bash
# Run k6 against the Docker stack capped at 2 CPU / 4 GB.
#
# Usage:
#   ./scripts/load/run-load-test.sh           # full ramp (default peak 200 VUs, ~8 min)
#   ./scripts/load/run-load-test.sh --quick   # short smoke (~1 min, 20 VUs)
#   ./scripts/load/run-load-test.sh --down    # stop the load-test stack and exit
#   MAX_VUS=100 ./scripts/load/run-load-test.sh
#
# The stack uses a separate Compose project (survey-builder-load) and host
# port 8088 so it does not collide with a normal `docker compose up` on 8080.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

DOCKER_CONTEXT="${DOCKER_CONTEXT:-default}"
DOCKER=(docker --context "${DOCKER_CONTEXT}")

export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-survey-builder-load}"
export WEB_HOST_PORT="${WEB_HOST_PORT:-8088}"
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-rescopesurveys}"
export POSTGRES_USER="${POSTGRES_USER:-rescopesurveys}"
export POSTGRES_DB="${POSTGRES_DB:-rescopesurveys}"
export JWT_SECRET="${JWT_SECRET:-load-test-secret-not-for-production-use-32ch}"
export MAX_VUS="${MAX_VUS:-200}"
export QUICK="${QUICK:-0}"

COMPOSE=("${DOCKER[@]}" compose -p "${COMPOSE_PROJECT_NAME}" -f docker-compose.yml -f docker-compose.load.yml)

QUICK_FLAG=0
DOWN_ONLY=0
for arg in "$@"; do
  case "$arg" in
    --quick|-q) QUICK_FLAG=1 ;;
    --down) DOWN_ONLY=1 ;;
    *)
      echo "Unknown argument: $arg" >&2
      echo "Usage: $0 [--quick] [--down]" >&2
      exit 1
      ;;
  esac
done

if [[ "$QUICK_FLAG" == "1" ]]; then
  export QUICK=1
  export MAX_VUS="${MAX_VUS_QUICK:-20}"
fi

if [[ "$DOWN_ONLY" == "1" ]]; then
  echo "Stopping ${COMPOSE_PROJECT_NAME}..."
  "${COMPOSE[@]}" --profile k6 down --remove-orphans
  exit 0
fi

mkdir -p k6/results
# k6 runs as a non-root user in grafana/k6; allow it to write the summary file.
chmod 777 k6/results

echo "Starting ${COMPOSE_PROJECT_NAME} (2 CPU / 4 GB app budget, web on :${WEB_HOST_PORT})..."
"${COMPOSE[@]}" up -d --build postgres api web load-stats

echo "Waiting for API health..."
ready=0
for _ in $(seq 1 60); do
  if "${COMPOSE[@]}" exec -T api curl -fsS http://127.0.0.1:3003/health >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 2
done
if [[ "$ready" != "1" ]]; then
  echo "API did not become healthy. Recent logs:" >&2
  "${COMPOSE[@]}" logs --tail=80 api
  exit 1
fi

echo "Running k6 (MAX_VUS=${MAX_VUS} QUICK=${QUICK})..."
set +e
"${COMPOSE[@]}" --profile k6 run --rm k6
k6_status=$?
set -e

echo ""
echo "k6 exit code: ${k6_status}"
echo "Summary JSON: ${ROOT}/k6/results/summary.json"
echo "App UI (load stack): http://localhost:${WEB_HOST_PORT}"
echo "Stop with: $0 --down"
exit "$k6_status"
