# tests/conftest.py
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.dependencias import obter_usuario_atual
from app.db.base import Base
from app.db.session import get_db
from app.models.usuario import TipoUsuario, Usuario

# 1. Cria um banco SQLite temporário na memória RAM
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine_test = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_test)

@pytest.fixture(autouse=True)
def limites_zerados():
    # Os contadores de tentativas ficam em memória; cada teste começa do zero
    from app.services import auth_service
    auth_service.resetar_limites()
    yield
    auth_service.resetar_limites()

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

def _usar_banco_de_teste(db_session):
    # Sobrescreve a dependência get_db do FastAPI para usar o SQLite temporário
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="function")
def client(db_session):
    # Já entra como admin, sem token: os testes de regra de negócio não precisam fazer login.
    # O admin é fictício (não está no banco), para não alterar contagens nem o admin inicial.
    _usar_banco_de_teste(db_session)
    admin = Usuario(id=0, nome="Admin de teste", email="admin-teste@escola.com", tipo=TipoUsuario.ADMIN, ativo=True)
    app.dependency_overrides[obter_usuario_atual] = lambda: admin
    yield TestClient(app)
    app.dependency_overrides.clear()

@pytest.fixture(scope="function")
def client_anonimo(db_session):
    # Autenticação real: cada requisição precisa mandar o próprio token
    _usar_banco_de_teste(db_session)
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
    security._carregar_chave_publica.cache_clear()
    yield publica_pem
    get_settings.cache_clear()
    security._carregar_chave_privada.cache_clear()
    security._carregar_chave_publica.cache_clear()
