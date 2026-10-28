# tests/conftest.py
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.base import Base
from app.db.session import get_db

# 1. Cria um banco SQLite temporário na memória RAM
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine_test = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_test)

@pytest.fixture(scope="function")
def db_session():
    # Cria as tabelas na memória antes de cada teste
    Base.metadata.create_all(bind=engine_test)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        # Apaga tudo da memória depois de cada teste
        Base.metadata.drop_all(bind=engine_test)

@pytest.fixture(scope="function")
def client(db_session):
    # Sobrescreve a dependência get_db do FastAPI para usar o SQLite temporário
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()

@pytest.fixture(scope="function")
def chaves_jwt(tmp_path, monkeypatch):
    # Gera um par RSA temporário e aponta a configuração para a chave privada
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import rsa

    from app.core import security
    from app.core.config import get_settings

    chave = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    privada_pem = chave.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    )
    publica_pem = chave.public_key().public_bytes(
        serialization.Encoding.PEM,
        serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    caminho = tmp_path / "jwt_private.pem"
    caminho.write_bytes(privada_pem)

    monkeypatch.setenv("JWT_PRIVATE_KEY_PATH", str(caminho))
    get_settings.cache_clear()
    security._carregar_chave_privada.cache_clear()
    yield publica_pem
    get_settings.cache_clear()
    security._carregar_chave_privada.cache_clear()
