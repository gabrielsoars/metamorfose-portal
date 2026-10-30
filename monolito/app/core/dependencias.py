from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from ..db.session import get_db
from ..models.usuario import Usuario
from ..repositories import usuario_repository
from . import security

# auto_error=False: sem isso o FastAPI responde 403 quando o header está ausente
_bearer = HTTPBearer(auto_error=False)


def _nao_autorizado() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token de acesso inválido ou ausente.",
        headers={"WWW-Authenticate": "Bearer"},
    )


def obter_usuario_atual(
    credenciais: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: Session = Depends(get_db),
) -> Usuario:
    """Valida o JWT e carrega o usuário do banco, respeitando tipo e ativo atuais."""
    if credenciais is None:
        raise _nao_autorizado()

    usuario_id = security.decodificar_access_token(credenciais.credentials)
    if usuario_id is None:
        raise _nao_autorizado()

    usuario = usuario_repository.buscar_por_id(db, usuario_id)
    if usuario is None or not usuario.ativo:
        raise _nao_autorizado()
    return usuario
