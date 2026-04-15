#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
APP_DOMAIN="${APP_DOMAIN:-}"
APP_PORT="${APP_PORT:-3005}"
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

# Carrega variaveis do arquivo .env.docker para o script (ex: APP_PORT)
set -a
source "${ENV_FILE}"
set +a

# Tenta liberar a porta antes de subir os containers
echo "[deploy] Tentando liberar a porta ${APP_PORT}..."

# 1. Tenta derrubar via Docker se houver container usando a porta
if command -v docker >/dev/null 2>&1; then
  docker ps -q --filter "publish=${APP_PORT}" | xargs -r docker stop >/dev/null 2>&1 || true
fi

# 2. Tenta via fuser (ferramenta padrao de portas)
if command -v fuser >/dev/null 2>&1; then
  fuser -k "${APP_PORT}/tcp" >/dev/null 2>&1 || true
fi

# 3. Tenta via lsof (ferramenta diagnostica)
if command -v lsof >/dev/null 2>&1; then
  lsof -ti :"${APP_PORT}" | xargs -r kill -9 >/dev/null 2>&1 || true
fi

# 4. Forca o Docker Compose a limpar redes e containers orfaos
"${DOCKER_COMPOSE[@]}" --env-file "${ENV_FILE}" down --remove-orphans >/dev/null 2>&1 || true

cd "${APP_DIR}"

echo "[deploy] Usando diretorio: ${APP_DIR}"
if [[ -n "${APP_DOMAIN}" ]]; then
  echo "[deploy] Dominio esperado: ${APP_DOMAIN}"
fi

echo "[deploy] Buildando e subindo containers (sem cache)..."
"${DOCKER_COMPOSE[@]}" --env-file "${ENV_FILE}" build --no-cache
"${DOCKER_COMPOSE[@]}" --env-file "${ENV_FILE}" up -d --remove-orphans

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
