#!/usr/bin/env bash
#
# Dump comprimido do Postgres em ./backups/. Rode depois de cada sessão de correção
# e guarde o arquivo fora do servidor (Drive, e-mail, etc.).
#
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f .env.prod ]]; then
  echo "ERRO: .env.prod não encontrado." >&2
  exit 1
fi

# shellcheck disable=SC1091
set -a; . ./.env.prod; set +a

mkdir -p backups
ARQUIVO="backups/metamorfose-$(date +%Y%m%d-%H%M).sql.gz"

docker compose --env-file .env.prod -f docker-compose.prod.yml \
  exec -T application_db pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" \
  | gzip > "$ARQUIVO"

echo "Backup salvo em ${ARQUIVO} ($(du -h "$ARQUIVO" | cut -f1))"
echo "Restaurar:  gunzip -c ${ARQUIVO} | docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T application_db psql -U ${POSTGRES_USER} -d ${POSTGRES_DB}"
