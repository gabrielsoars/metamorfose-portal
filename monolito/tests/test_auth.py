from datetime import datetime, timedelta

import jwt
import pytest

from app.core import security
from app.models.usuario import TipoUsuario, Usuario
from app.services import email_service


@pytest.fixture
def codigos_enviados(monkeypatch):
    # Captura o código que seria enviado por e-mail
    enviados = {}
    monkeypatch.setattr(
        email_service, "enviar_codigo_ativacao",
        lambda email, codigo: enviados.__setitem__(email, codigo),
    )
    return enviados


@pytest.fixture
def codigos_redefinicao(monkeypatch):
    enviados = {}
    monkeypatch.setattr(
        email_service, "enviar_codigo_redefinicao",
        lambda email, codigo: enviados.__setitem__(email, codigo),
    )
    return enviados


def codigo_diferente(codigo):
    return f"{(int(codigo) + 1) % 1_000_000:06d}"


def login(client, email="ativo@escola.com", senha="senha-forte-123"):
    return client.post("/auth/login", json={"email": email, "senha": senha})


def cadastrar_professor(client, email="prof@escola.com"):
    response = client.post("/usuarios", json={"nome": "Prof", "email": email, "tipo": 1})
    assert response.status_code == 201
    return response.json()["id"]


def criar_usuario_com_senha(db_session, email="ativo@escola.com", senha="senha-forte-123", ativo=True):
    usuario = Usuario(
        nome="Ativo", email=email, tipo=TipoUsuario.PROFESSOR,
        senha_hash=security.gerar_hash(senha), ativo=ativo,
    )
    db_session.add(usuario)
    db_session.commit()
    return usuario


# ── Emissão do JWT ────────────────────────────────────────────────────────────

def test_criar_access_token_contem_claims_esperadas(chaves_jwt):
    token = security.criar_access_token(42)

    assert jwt.get_unverified_header(token)["alg"] == "RS256"
    payload = jwt.decode(
        token, chaves_jwt, algorithms=["RS256"],
        audience="metamorfose-scan-service", issuer="metamorfose-monolito",
    )
    assert payload["sub"] == "42"
    assert payload["exp"] - payload["iat"] == 60 * 60
    # Payload enxuto: nenhuma informação além das claims padrão
    assert set(payload) == {"sub", "iss", "aud", "iat", "exp"}


def test_criar_access_token_sem_chave_configurada(monkeypatch):
    from app.core.config import get_settings
    monkeypatch.delenv("JWT_PRIVATE_KEY_PATH", raising=False)
    get_settings.cache_clear()
    try:
        with pytest.raises(RuntimeError):
            security.criar_access_token(1)
    finally:
        get_settings.cache_clear()


# ── Login ─────────────────────────────────────────────────────────────────────

def test_login_com_sucesso_retorna_jwt(client, db_session, chaves_jwt):
    usuario = criar_usuario_com_senha(db_session)

    response = client.post("/auth/login", json={"email": "ativo@escola.com", "senha": "senha-forte-123"})

    assert response.status_code == 200
    data = response.json()
    assert data["token_type"] == "bearer"
    assert data["expires_in"] == 3600
    payload = jwt.decode(
        data["access_token"], chaves_jwt, algorithms=["RS256"],
        audience="metamorfose-scan-service", issuer="metamorfose-monolito",
    )
    assert payload["sub"] == str(usuario.id)


def test_login_senha_incorreta(client, db_session, chaves_jwt):
    criar_usuario_com_senha(db_session)
    response = client.post("/auth/login", json={"email": "ativo@escola.com", "senha": "errada"})
    assert response.status_code == 401
    assert response.json()["detail"] == "E-mail ou senha inválidos."


def test_login_email_inexistente(client, chaves_jwt):
    response = client.post("/auth/login", json={"email": "ninguem@escola.com", "senha": "qualquer"})
    assert response.status_code == 401
    assert response.json()["detail"] == "E-mail ou senha inválidos."


def test_login_usuario_sem_senha_cadastrada(client, codigos_enviados, chaves_jwt):
    cadastrar_professor(client)
    response = client.post("/auth/login", json={"email": "prof@escola.com", "senha": "qualquer"})
    assert response.status_code == 401


def test_login_usuario_desativado(client, db_session, chaves_jwt):
    criar_usuario_com_senha(db_session, ativo=False)
    response = client.post("/auth/login", json={"email": "ativo@escola.com", "senha": "senha-forte-123"})
    assert response.status_code == 403


# ── Primeiro acesso ───────────────────────────────────────────────────────────

def test_cadastro_envia_codigo_e_guarda_somente_hash(client, db_session, codigos_enviados):
    usuario_id = cadastrar_professor(client)

    codigo = codigos_enviados["prof@escola.com"]
    assert len(codigo) == 6 and codigo.isdigit()
    usuario = db_session.get(Usuario, usuario_id)
    assert usuario.token_ativacao != codigo
    assert security.verificar_hash(codigo, usuario.token_ativacao)
    assert usuario.token_expiracao > datetime.utcnow()


def test_fluxo_primeiro_acesso_ate_login(client, codigos_enviados, chaves_jwt):
    usuario_id = cadastrar_professor(client)
    codigo = codigos_enviados["prof@escola.com"]

    response = client.post("/auth/ativar", json={
        "email": "prof@escola.com", "codigo": codigo, "senha": "minha-senha-123",
    })
    assert response.status_code == 204
    assert client.get(f"/usuarios/{usuario_id}").json()["ativo"] is True

    response = client.post("/auth/login", json={"email": "prof@escola.com", "senha": "minha-senha-123"})
    assert response.status_code == 200

    # O código não pode ser reutilizado
    response = client.post("/auth/ativar", json={
        "email": "prof@escola.com", "codigo": codigo, "senha": "outra-senha-123",
    })
    assert response.status_code == 400


def test_ativar_com_codigo_incorreto(client, codigos_enviados):
    cadastrar_professor(client)
    codigo_errado = f"{(int(codigos_enviados['prof@escola.com']) + 1) % 1_000_000:06d}"

    response = client.post("/auth/ativar", json={
        "email": "prof@escola.com", "codigo": codigo_errado, "senha": "minha-senha-123",
    })
    assert response.status_code == 400
    assert response.json()["detail"] == "Código de ativação inválido ou expirado."


def test_ativar_com_codigo_expirado(client, db_session, codigos_enviados):
    usuario_id = cadastrar_professor(client)
    usuario = db_session.get(Usuario, usuario_id)
    usuario.token_expiracao = datetime.utcnow() - timedelta(minutes=1)
    db_session.commit()

    response = client.post("/auth/ativar", json={
        "email": "prof@escola.com", "codigo": codigos_enviados["prof@escola.com"], "senha": "minha-senha-123",
    })
    assert response.status_code == 400


def test_reenviar_ativacao_gera_novo_codigo(client, codigos_enviados):
    cadastrar_professor(client)
    codigos_enviados.clear()

    response = client.post("/auth/reenviar-ativacao", json={"email": "prof@escola.com"})

    assert response.status_code == 202
    assert "prof@escola.com" in codigos_enviados


def test_reenviar_ativacao_email_inexistente_nao_revela(client, codigos_enviados):
    response = client.post("/auth/reenviar-ativacao", json={"email": "ninguem@escola.com"})
    assert response.status_code == 202
    assert codigos_enviados == {}


# ── Usuário logado (/auth/me) ─────────────────────────────────────────────────

def test_me_retorna_usuario_do_token(client, db_session, chaves_jwt):
    criar_usuario_com_senha(db_session)
    token = login(client).json()["access_token"]

    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "ativo@escola.com"
    assert data["tipo"] == TipoUsuario.PROFESSOR
    assert "senha_hash" not in data


def test_me_sem_token(client, chaves_jwt):
    assert client.get("/auth/me").status_code == 401


def test_me_token_invalido(client, chaves_jwt):
    response = client.get("/auth/me", headers={"Authorization": "Bearer nao-e-um-jwt"})
    assert response.status_code == 401


def test_me_token_expirado(client, db_session, chaves_jwt, monkeypatch):
    usuario = criar_usuario_com_senha(db_session)
    monkeypatch.setenv("JWT_EXPIRE_MINUTES", "-1")
    from app.core.config import get_settings
    get_settings.cache_clear()
    token = security.criar_access_token(usuario.id)

    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 401


def test_me_usuario_desativado_depois_do_login(client, db_session, chaves_jwt):
    usuario = criar_usuario_com_senha(db_session)
    token = login(client).json()["access_token"]
    usuario.ativo = False
    db_session.commit()

    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 401


# ── Limite de tentativas ──────────────────────────────────────────────────────

def test_login_bloqueia_apos_5_senhas_erradas(client, db_session, chaves_jwt):
    criar_usuario_com_senha(db_session)
    for _ in range(5):
        assert login(client, senha="errada").status_code == 401

    # Bloqueado mesmo com a senha certa
    response = login(client)
    assert response.status_code == 429


def test_login_bloqueio_nao_afeta_outro_email(client, db_session, chaves_jwt):
    criar_usuario_com_senha(db_session)
    for _ in range(5):
        login(client, email="outro@escola.com", senha="errada")

    assert login(client).status_code == 200


def test_login_com_sucesso_zera_tentativas(client, db_session, chaves_jwt):
    criar_usuario_com_senha(db_session)
    for _ in range(4):
        login(client, senha="errada")
    assert login(client).status_code == 200

    for _ in range(4):
        assert login(client, senha="errada").status_code == 401
    assert login(client).status_code == 200


def test_ativar_invalida_codigo_apos_5_erros(client, codigos_enviados):
    cadastrar_professor(client)
    codigo = codigos_enviados["prof@escola.com"]
    for _ in range(5):
        client.post("/auth/ativar", json={
            "email": "prof@escola.com", "codigo": codigo_diferente(codigo), "senha": "minha-senha-123",
        })

    # Nem o código certo vale mais
    response = client.post("/auth/ativar", json={
        "email": "prof@escola.com", "codigo": codigo, "senha": "minha-senha-123",
    })
    assert response.status_code == 400

    # Um código novo funciona
    client.post("/auth/reenviar-ativacao", json={"email": "prof@escola.com"})
    response = client.post("/auth/ativar", json={
        "email": "prof@escola.com", "codigo": codigos_enviados["prof@escola.com"], "senha": "minha-senha-123",
    })
    assert response.status_code == 204


def test_novo_codigo_zera_tentativas_erradas(client, codigos_enviados):
    cadastrar_professor(client)
    for _ in range(4):
        client.post("/auth/ativar", json={
            "email": "prof@escola.com", "codigo": codigo_diferente(codigos_enviados["prof@escola.com"]),
            "senha": "minha-senha-123",
        })
    client.post("/auth/reenviar-ativacao", json={"email": "prof@escola.com"})
    codigo = codigos_enviados["prof@escola.com"]

    # Um erro com o código novo não invalida o código
    client.post("/auth/ativar", json={
        "email": "prof@escola.com", "codigo": codigo_diferente(codigo), "senha": "minha-senha-123",
    })
    response = client.post("/auth/ativar", json={
        "email": "prof@escola.com", "codigo": codigo, "senha": "minha-senha-123",
    })
    assert response.status_code == 204


def test_reenviar_ativacao_limitado_a_um_por_minuto(client, codigos_enviados):
    cadastrar_professor(client)
    client.post("/auth/reenviar-ativacao", json={"email": "prof@escola.com"})
    primeiro = codigos_enviados["prof@escola.com"]
    codigos_enviados.clear()

    response = client.post("/auth/reenviar-ativacao", json={"email": "prof@escola.com"})

    # Mesma resposta, mas nenhum e-mail novo; o código anterior continua valendo
    assert response.status_code == 202
    assert codigos_enviados == {}
    response = client.post("/auth/ativar", json={
        "email": "prof@escola.com", "codigo": primeiro, "senha": "minha-senha-123",
    })
    assert response.status_code == 204


# ── Esqueci minha senha ───────────────────────────────────────────────────────

def test_fluxo_redefinicao_de_senha(client, db_session, codigos_redefinicao, chaves_jwt):
    criar_usuario_com_senha(db_session)

    response = client.post("/auth/esqueci-senha", json={"email": "ativo@escola.com"})
    assert response.status_code == 202
    codigo = codigos_redefinicao["ativo@escola.com"]

    response = client.post("/auth/redefinir-senha", json={
        "email": "ativo@escola.com", "codigo": codigo, "senha": "senha-nova-456",
    })
    assert response.status_code == 204

    assert login(client).status_code == 401
    assert login(client, senha="senha-nova-456").status_code == 200

    # O código não pode ser reutilizado
    response = client.post("/auth/redefinir-senha", json={
        "email": "ativo@escola.com", "codigo": codigo, "senha": "outra-senha-789",
    })
    assert response.status_code == 400


def test_esqueci_senha_email_inexistente_nao_revela(client, codigos_redefinicao):
    response = client.post("/auth/esqueci-senha", json={"email": "ninguem@escola.com"})
    assert response.status_code == 202
    assert codigos_redefinicao == {}


def test_esqueci_senha_ignora_conta_nao_ativada(client, codigos_enviados, codigos_redefinicao):
    cadastrar_professor(client)
    response = client.post("/auth/esqueci-senha", json={"email": "prof@escola.com"})
    assert response.status_code == 202
    assert codigos_redefinicao == {}


def test_esqueci_senha_ignora_usuario_desativado(client, db_session, codigos_redefinicao):
    criar_usuario_com_senha(db_session, ativo=False)
    client.post("/auth/esqueci-senha", json={"email": "ativo@escola.com"})
    assert codigos_redefinicao == {}


def test_redefinir_com_codigo_incorreto(client, db_session, codigos_redefinicao):
    criar_usuario_com_senha(db_session)
    client.post("/auth/esqueci-senha", json={"email": "ativo@escola.com"})

    response = client.post("/auth/redefinir-senha", json={
        "email": "ativo@escola.com", "codigo": codigo_diferente(codigos_redefinicao["ativo@escola.com"]),
        "senha": "senha-nova-456",
    })
    assert response.status_code == 400
    assert response.json()["detail"] == "Código de redefinição inválido ou expirado."


def test_codigo_de_redefinicao_nao_ativa_conta(client, db_session, codigos_redefinicao):
    criar_usuario_com_senha(db_session)
    client.post("/auth/esqueci-senha", json={"email": "ativo@escola.com"})

    response = client.post("/auth/ativar", json={
        "email": "ativo@escola.com", "codigo": codigos_redefinicao["ativo@escola.com"], "senha": "senha-nova-456",
    })
    assert response.status_code == 400


def test_codigo_de_ativacao_nao_redefine_senha(client, codigos_enviados):
    cadastrar_professor(client)
    response = client.post("/auth/redefinir-senha", json={
        "email": "prof@escola.com", "codigo": codigos_enviados["prof@escola.com"], "senha": "senha-nova-456",
    })
    assert response.status_code == 400


def test_redefinir_senha_desbloqueia_login(client, db_session, codigos_redefinicao, chaves_jwt):
    criar_usuario_com_senha(db_session)
    for _ in range(5):
        login(client, senha="errada")
    assert login(client).status_code == 429

    client.post("/auth/esqueci-senha", json={"email": "ativo@escola.com"})
    client.post("/auth/redefinir-senha", json={
        "email": "ativo@escola.com", "codigo": codigos_redefinicao["ativo@escola.com"], "senha": "senha-nova-456",
    })

    assert login(client, senha="senha-nova-456").status_code == 200


# ── Admin inicial ─────────────────────────────────────────────────────────────

def test_admin_inicial_criado_e_recebe_codigo(db_session, codigos_enviados):
    from app.services import usuario_service

    admin = usuario_service.garantir_admin_inicial(db_session, "coord@escola.com", "Coordenação")

    assert admin.tipo == TipoUsuario.ADMIN
    assert admin.nome == "Coordenação"
    assert admin.senha_hash is None
    assert "coord@escola.com" in codigos_enviados


def test_admin_inicial_ativa_conta_e_faz_login(client, db_session, codigos_enviados, chaves_jwt):
    from app.services import usuario_service
    usuario_service.garantir_admin_inicial(db_session, "coord@escola.com", "Coordenação")

    response = client.post("/auth/ativar", json={
        "email": "coord@escola.com", "codigo": codigos_enviados["coord@escola.com"], "senha": "senha-do-admin",
    })
    assert response.status_code == 204
    response = client.post("/auth/login", json={"email": "coord@escola.com", "senha": "senha-do-admin"})
    assert response.status_code == 200


def test_admin_inicial_nao_cria_se_ja_existe_admin(db_session, codigos_enviados):
    from app.services import usuario_service
    usuario_service.garantir_admin_inicial(db_session, "coord@escola.com", "Coordenação")
    codigos_enviados.clear()

    assert usuario_service.garantir_admin_inicial(db_session, "outro@escola.com", "Outro") is None
    assert db_session.query(Usuario).filter(Usuario.email == "outro@escola.com").first() is None
    assert codigos_enviados == {}


def test_admin_inicial_sem_email_configurado_nao_faz_nada(db_session, codigos_enviados):
    from app.services import usuario_service
    assert usuario_service.garantir_admin_inicial(db_session, None, "Administrador") is None
    assert db_session.query(Usuario).count() == 0


def test_admin_inicial_promove_usuario_existente(client, db_session, codigos_enviados):
    from app.services import usuario_service
    usuario_id = cadastrar_professor(client, email="coord@escola.com")

    admin = usuario_service.garantir_admin_inicial(db_session, "coord@escola.com", "Coordenação")

    assert admin.id == usuario_id
    assert admin.tipo == TipoUsuario.ADMIN
    assert db_session.query(Usuario).count() == 1
