from datetime import datetime, timedelta, timezone
from functools import lru_cache

import bcrypt
import jwt

from .config import get_settings

# Hash usado quando o e-mail não existe, para que o tempo de resposta do login
# não revele se o usuário está cadastrado.
_HASH_FICTICIO = bcrypt.hashpw(b"senha-ficticia", bcrypt.gensalt()).decode()


def gerar_hash(valor: str) -> str:
    return bcrypt.hashpw(valor.encode(), bcrypt.gensalt()).decode()


def verificar_hash(valor: str, valor_hash: str | None) -> bool:
    if not valor_hash:
        bcrypt.checkpw(valor.encode(), _HASH_FICTICIO.encode())
        return False
    try:
        return bcrypt.checkpw(valor.encode(), valor_hash.encode())
    except ValueError:
        return False


@lru_cache
def _carregar_chave_privada(caminho: str) -> str:
    with open(caminho, encoding="utf-8") as arquivo:
        return arquivo.read()


def criar_access_token(usuario_id: int) -> str:
    settings = get_settings()
    if not settings.jwt_private_key_path:
        raise RuntimeError("JWT_PRIVATE_KEY_PATH não configurado.")

    agora = datetime.now(timezone.utc)
    payload = {
        "sub": str(usuario_id),
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
        "iat": agora,
        "exp": agora + timedelta(minutes=settings.jwt_expire_minutes),
    }
    chave = _carregar_chave_privada(settings.jwt_private_key_path)
    return jwt.encode(payload, chave, algorithm=settings.jwt_algorithm)
