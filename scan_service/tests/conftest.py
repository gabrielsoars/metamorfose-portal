from datetime import datetime, timedelta, timezone

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient

from app import auth
from app.config import get_settings
from app.main import app

ISSUER = "metamorfose-monolito"
AUDIENCE = "metamorfose-scan-service"


def _gerar_par_rsa():
    chave = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    privada = chave.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    )
    publica = chave.public_key().public_bytes(
        serialization.Encoding.PEM,
        serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    return privada, publica


@pytest.fixture(scope="session")
def par_rsa():
    return _gerar_par_rsa()


@pytest.fixture(scope="session")
def outro_par_rsa():
    return _gerar_par_rsa()


@pytest.fixture(autouse=True)
def chave_publica_configurada(par_rsa, tmp_path, monkeypatch):
    caminho = tmp_path / "jwt_public.pem"
    caminho.write_bytes(par_rsa[1])
    monkeypatch.setenv("JWT_PUBLIC_KEY_PATH", str(caminho))
    get_settings.cache_clear()
    auth._carregar_chave_publica.cache_clear()
    yield
    get_settings.cache_clear()
    auth._carregar_chave_publica.cache_clear()


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def criar_token(par_rsa):
    """Gera tokens no mesmo formato emitido pelo monólito, com overrides opcionais."""
    def _criar(usuario_id=42, chave=None, algoritmo="RS256", remover=(), **claims):
        agora = datetime.now(timezone.utc)
        payload = {
            "sub": str(usuario_id),
            "iss": ISSUER,
            "aud": AUDIENCE,
            "iat": agora,
            "exp": agora + timedelta(minutes=60),
        }
        payload.update(claims)
        for claim in remover:
            payload.pop(claim)
        return jwt.encode(payload, chave if chave is not None else par_rsa[0], algorithm=algoritmo)
    return _criar
