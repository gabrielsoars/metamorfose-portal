from datetime import datetime, timedelta, timezone
from functools import lru_cache

import bcrypt
import jwt
from cryptography.hazmat.primitives import serialization

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


@lru_cache
def _carregar_chave_publica(caminho_privada: str) -> str:
    # Derivada da chave privada: o monolito não precisa de um arquivo a mais
    privada = serialization.load_pem_private_key(
        _carregar_chave_privada(caminho_privada).encode(), password=None
    )
    return privada.public_key().public_bytes(
        serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode()


def _caminho_chave_privada() -> str:
    caminho = get_settings().jwt_private_key_path
    if not caminho:
        raise RuntimeError("JWT_PRIVATE_KEY_PATH não configurado.")
    return caminho


def decodificar_access_token(token: str) -> int | None:
    """Valida assinatura, expiração, emissor e audiência; retorna o id do usuário ou None."""
    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            _carregar_chave_publica(_caminho_chave_privada()),
            algorithms=[settings.jwt_algorithm],
            audience=settings.jwt_audience,
            issuer=settings.jwt_issuer,
            options={"require": ["sub", "exp", "iat", "iss", "aud"]},
        )
    except jwt.PyJWTError:
        return None

    sub = payload["sub"]
    if not isinstance(sub, str) or not sub.isdigit():
        return None
    return int(sub)


def criar_access_token(usuario_id: int) -> str:
    settings = get_settings()
    caminho = _caminho_chave_privada()

    agora = datetime.now(timezone.utc)
    payload = {
        "sub": str(usuario_id),
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
        "iat": agora,
        "exp": agora + timedelta(minutes=settings.jwt_expire_minutes),
    }
    chave = _carregar_chave_privada(caminho)
    return jwt.encode(payload, chave, algorithm=settings.jwt_algorithm)
