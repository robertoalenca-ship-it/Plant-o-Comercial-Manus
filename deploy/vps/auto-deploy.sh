#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
APP_BRANCH="${APP_BRANCH:-main}"
DEPLOY_SCRIPT="${DEPLOY_SCRIPT:-${APP_DIR}/deploy/vps/deploy.sh}"
STATE_FILE="${STATE_FILE:-${APP_DIR}/.last_deployed_commit}"
LOG_PREFIX="[auto-deploy]"

cd "${APP_DIR}"

if [[ ! -x "${DEPLOY_SCRIPT}" ]]; then
  echo "${LOG_PREFIX} Script de deploy nao encontrado ou sem permissao: ${DEPLOY_SCRIPT}"
  exit 1
fi

echo "${LOG_PREFIX} Buscando atualizacoes de origin/${APP_BRANCH}..."
git fetch origin "${APP_BRANCH}" --quiet

REMOTE_COMMIT="$(git rev-parse "origin/${APP_BRANCH}")"
LOCAL_COMMIT="$(git rev-parse HEAD)"
LAST_DEPLOYED=""

if [[ -f "${STATE_FILE}" ]]; then
  LAST_DEPLOYED="$(<"${STATE_FILE}")"
fi

if [[ "${LOCAL_COMMIT}" == "${REMOTE_COMMIT}" && "${LAST_DEPLOYED}" == "${REMOTE_COMMIT}" ]]; then
  echo "${LOG_PREFIX} Sem novidades em ${APP_BRANCH}."
  exit 0
fi

echo "${LOG_PREFIX} Novo commit detectado: ${REMOTE_COMMIT}"
git checkout "${APP_BRANCH}" >/dev/null 2>&1
git reset --hard "origin/${APP_BRANCH}" >/dev/null 2>&1

"${DEPLOY_SCRIPT}"

printf '%s' "${REMOTE_COMMIT}" > "${STATE_FILE}"
echo "${LOG_PREFIX} Deploy concluido em ${REMOTE_COMMIT}."
