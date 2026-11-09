"""
Validação local do JWT emitido pelo monólito.

Uso nos endpoints protegidos:
    usuario_id: int = Depends(obter_usuario_id)
"""

import logging
from functools import lru_cache
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import get_settings

logger = logging.getLogger(__name__)

# auto_error=False: sem isso o FastAPI responde 403 quando o header está ausente
_bearer = HTTPBearer(auto_error=False)

CLAIMS_OBRIGATORIAS = ["sub", "exp", "iat", "iss", "aud"]


@lru_cache
def _carregar_chave_publica(caminho: str) -> str:
    with open(caminho, encoding="utf-8") as arquivo:
        return arquivo.read()


def _nao_autorizado() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token de acesso inválido ou ausente.",
        headers={"WWW-Authenticate": "Bearer"},
    )


def obter_usuario_id(
    credenciais: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> int:
    """Valida assinatura, algoritmo, expiração, emissor e audiência; retorna o user_id (claim sub)."""
    if credenciais is None:
        raise _nao_autorizado()

    settings = get_settings()
    if not settings.jwt_public_key_path:
        raise RuntimeError("JWT_PUBLIC_KEY_PATH não configurado.")

    try:
        payload = jwt.decode(
            credenciais.credentials,
            _carregar_chave_publica(settings.jwt_public_key_path),
            algorithms=[settings.jwt_algorithm],
            audience=settings.jwt_audience,
            issuer=settings.jwt_issuer,
            leeway=settings.jwt_leeway_seconds,
            options={"require": CLAIMS_OBRIGATORIAS},
        )
    except jwt.PyJWTError as err:
        # Registra só o motivo; nunca o token
        logger.info("JWT rejeitado: %s", type(err).__name__)
        raise _nao_autorizado()

    sub = payload["sub"]
    if not isinstance(sub, str) or not sub.isdigit():
        logger.info("JWT rejeitado: claim sub inválida")
        raise _nao_autorizado()

    return int(sub)
