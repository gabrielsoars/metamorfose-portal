#!/usr/bin/env bash
#
# Sobe o Metamorfose em produção numa VPS limpa (Ubuntu/Debian).
#
# O que faz:
#   1. instala o Docker (se ainda não existir);
#   2. cria o .env.prod com senha de banco gerada e o domínio escolhido;
#   3. gera o par de chaves RSA do JWT em ./keys (nunca vai para o Git);
#   4. sobe Postgres, monolito, scan, frontend e Caddy com build;
#   5. imprime os registros de DNS que faltam e como ler o código do admin.
#
# Uso:
#   bash setup.sh              # interativo (recomendado)
#   bash setup.sh --force      # recria o .env.prod com os valores informados
#
set -euo pipefail

cd "$(dirname "$0")"

if [[ ! -f docker-compose.prod.yml ]]; then
  echo "ERRO: rode este script na raiz do repositório (não achei docker-compose.prod.yml)." >&2
  exit 1
fi

# ── Docker ────────────────────────────────────────────────────────────────────
if ! command -v docker >/dev/null 2>&1; then
  echo "==> Instalando Docker..."
  curl -fsSL https://get.docker.com | sh
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "ERRO: Docker Compose v2 não encontrado. Instale o plugin e rode de novo." >&2
  exit 1
fi

# ── .env.prod ─────────────────────────────────────────────────────────────────
if [[ -f .env.prod && "${1:-}" != "--force" ]]; then
  echo "==> .env.prod já existe; mantendo os valores atuais (use --force para recriar)."
else
  read -r -p "Domínio base (ex.: metamorfose.com.br): " DOMAIN_BASE
  DOMAIN_BASE=${DOMAIN_BASE:-metamorfose.com.br}

  read -r -p "E-mail do admin inicial: " ADMIN_EMAIL
  ADMIN_EMAIL=${ADMIN_EMAIL:-admin@metamorfose.local}

  read -r -p "Host SMTP (enter para pular e ler o código no log): " SMTP_HOST
  SMTP_USER=""; SMTP_PASSWORD=""; SMTP_FROM="nao-responda@${DOMAIN_BASE}"
  if [[ -n "$SMTP_HOST" ]]; then
    read -r -p "Usuário SMTP: " SMTP_USER
    read -r -s -p "Senha SMTP: " SMTP_PASSWORD; echo
    read -r -p "Remetente [nao-responda@${DOMAIN_BASE}]: " SMTP_FROM_IN
    SMTP_FROM=${SMTP_FROM_IN:-$SMTP_FROM}
  fi

  POSTGRES_PASSWORD="$(openssl rand -hex 24)"

  cat > .env.prod <<EOF
# Gerado por setup.sh em $(date -u +%Y-%m-%dT%H:%MZ). NÃO versionar.
POSTGRES_USER=metamorfose
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=metamorfose

DOMAIN_BASE=${DOMAIN_BASE}
DOMAIN_APP=app.${DOMAIN_BASE}
DOMAIN_API=api.${DOMAIN_BASE}
DOMAIN_SCAN=scan.${DOMAIN_BASE}

# Única origem de navegador liberada (CORS do monolito e do scan).
CORS_ORIGINS=https://app.${DOMAIN_BASE}

JWT_ALGORITHM=RS256
JWT_ISSUER=metamorfose-monolito
JWT_AUDIENCE=metamorfose-scan-service
JWT_EXPIRE_MINUTES=60

ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_NOME=Administrador

SMTP_HOST=${SMTP_HOST}
SMTP_PORT=587
SMTP_USER=${SMTP_USER}
SMTP_PASSWORD=${SMTP_PASSWORD}
SMTP_FROM=${SMTP_FROM}
SMTP_USE_TLS=true
EOF
  chmod 600 .env.prod
  echo "==> .env.prod criado."
fi

# ── Chaves JWT ────────────────────────────────────────────────────────────────
mkdir -p keys
if [[ ! -f keys/jwt_private.pem ]]; then
  echo "==> Gerando par de chaves RSA do JWT..."
  openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out keys/jwt_private.pem
  openssl rsa -in keys/jwt_private.pem -pubout -out keys/jwt_public.pem 2>/dev/null
  chmod 600 keys/jwt_private.pem
fi

# ── Build e subida ────────────────────────────────────────────────────────────
COMPOSE=(docker compose --env-file .env.prod -f docker-compose.prod.yml)

echo "==> Construindo imagens e subindo os serviços (leva alguns minutos)..."
"${COMPOSE[@]}" up -d --build

echo
"${COMPOSE[@]}" ps

# ── Instruções finais ─────────────────────────────────────────────────────────
# shellcheck disable=SC1091
set -a; . ./.env.prod; set +a

IP_PUBLICO="$(curl -fsS https://api.ipify.org 2>/dev/null || echo 'IP_DO_SERVIDOR')"

cat <<EOF

────────────────────────────────────────────────────────────────────────
Próximos passos

1) DNS (no seu provedor de domínio), todos apontando para ${IP_PUBLICO}:
     A  app.${DOMAIN_BASE}    → ${IP_PUBLICO}
     A  api.${DOMAIN_BASE}    → ${IP_PUBLICO}
     A  scan.${DOMAIN_BASE}   → ${IP_PUBLICO}

   O Caddy só emite o certificado depois que o DNS propaga. Acompanhe com:
     ${COMPOSE[*]} logs -f caddy

2) Código de primeiro acesso do admin (se não configurou SMTP):
     ${COMPOSE[*]} logs monolito | grep "Código"

3) Status e logs:
     ${COMPOSE[*]} ps
     ${COMPOSE[*]} logs -f monolito

4) Backup do banco:
     bash scripts/backup.sh

5) Atualizar depois de um git pull:
     bash setup.sh

App:  https://app.${DOMAIN_BASE}
API:  https://api.${DOMAIN_BASE}/docs   (considere desativar /docs em produção)
Scan: https://scan.${DOMAIN_BASE}/health
────────────────────────────────────────────────────────────────────────
EOF
