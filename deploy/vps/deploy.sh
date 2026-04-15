#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
APP_DOMAIN="${APP_DOMAIN:-}"
APP_PORT="${APP_PORT:-3000}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-http://127.0.0.1:${APP_PORT}/healthz}"
ENV_FILE="${ENV_FILE:-${APP_DIR}/.env.docker}"

if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  DOCKER_COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  DOCKER_COMPOSE=(docker-compose)
else
  echo "[deploy] Docker Compose nao encontrado."
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "[deploy] Arquivo ${ENV_FILE} nao encontrado."
  echo "[deploy] Crie ${ENV_FILE} a partir de .env.docker.example antes do primeiro deploy."
  exit 1
fi

cd "${APP_DIR}"

echo "[deploy] Usando diretorio: ${APP_DIR}"
if [[ -n "${APP_DOMAIN}" ]]; then
  echo "[deploy] Dominio esperado: ${APP_DOMAIN}"
fi

echo "[deploy] Buildando e subindo containers..."
"${DOCKER_COMPOSE[@]}" --env-file "${ENV_FILE}" up -d --build --remove-orphans

echo "[deploy] Aguardando healthcheck em ${HEALTHCHECK_URL}..."
for attempt in {1..20}; do
  if curl --fail --silent --show-error "${HEALTHCHECK_URL}" >/dev/null; then
    echo "[deploy] Aplicacao saudavel."
    "${DOCKER_COMPOSE[@]}" --env-file "${ENV_FILE}" ps
    exit 0
  fi

  echo "[deploy] Tentativa ${attempt}/20 falhou. Tentando novamente em 5s..."
  sleep 5
done

echo "[deploy] Healthcheck falhou. Ultimos logs da aplicacao:"
"${DOCKER_COMPOSE[@]}" --env-file "${ENV_FILE}" logs --tail=120 app
exit 1
