import pytest

from app.core import security
from app.models.usuario import TipoUsuario, Usuario


def criar_usuario(db_session, email, tipo, ativo=True):
    usuario = Usuario(
        nome=email.split("@")[0], email=email, tipo=tipo,
        senha_hash=security.gerar_hash("senha-forte-123"), ativo=ativo,
    )
    db_session.add(usuario)
    db_session.commit()
    return usuario


def cabecalho(usuario):
    return {"Authorization": f"Bearer {security.criar_access_token(usuario.id)}"}


ROTAS_PROTEGIDAS = [
    ("GET", "/turmas"),
    ("POST", "/turmas"),
    ("GET", "/turmas/1"),
    ("DELETE", "/turmas/1"),
    ("GET", "/turmas/1/alunos"),
    ("GET", "/alunos/1"),
    ("GET", "/simulados"),
    ("POST", "/simulados"),
    ("GET", "/simulados/1"),
    ("DELETE", "/simulados/1"),
    ("GET", "/usuarios"),
    ("POST", "/usuarios"),
    ("GET", "/usuarios/1"),
    ("PATCH", "/usuarios/1"),
]

ROTAS_DE_ADMIN = [
    ("GET", "/usuarios", None),
    ("GET", "/usuarios/1", None),
    ("POST", "/usuarios", {"nome": "Intruso", "email": "intruso@escola.com", "tipo": 0}),
    ("PATCH", "/usuarios/1", {"tipo": 0}),
]


@pytest.mark.parametrize("metodo,url", ROTAS_PROTEGIDAS)
def test_rotas_exigem_token(client_anonimo, chaves_jwt, metodo, url):
    response = client_anonimo.request(metodo, url, json={})
    assert response.status_code == 401


def test_token_invalido_e_recusado(client_anonimo, chaves_jwt):
    response = client_anonimo.get("/turmas", headers={"Authorization": "Bearer token-falso"})
    assert response.status_code == 401


def test_professor_acessa_turmas(client_anonimo, db_session, chaves_jwt):
    professor = criar_usuario(db_session, "prof@escola.com", TipoUsuario.PROFESSOR)
    response = client_anonimo.get("/turmas", headers=cabecalho(professor))
    assert response.status_code == 200


@pytest.mark.parametrize("metodo,url,corpo", ROTAS_DE_ADMIN)
def test_professor_nao_gerencia_usuarios(client_anonimo, db_session, chaves_jwt, metodo, url, corpo):
    professor = criar_usuario(db_session, "prof@escola.com", TipoUsuario.PROFESSOR)

    response = client_anonimo.request(metodo, url, json=corpo, headers=cabecalho(professor))

    assert response.status_code == 403
    assert db_session.get(Usuario, professor.id).tipo == TipoUsuario.PROFESSOR
    assert db_session.query(Usuario).filter(Usuario.email == "intruso@escola.com").first() is None


def test_admin_cadastra_usuario(client_anonimo, db_session, chaves_jwt, monkeypatch):
    from app.services import email_service
    monkeypatch.setattr(email_service, "enviar_codigo_ativacao", lambda email, codigo: None)
    admin = criar_usuario(db_session, "admin@escola.com", TipoUsuario.ADMIN)

    response = client_anonimo.post(
        "/usuarios", json={"nome": "Nova", "email": "nova@escola.com", "tipo": 1}, headers=cabecalho(admin),
    )

    assert response.status_code == 201


def test_usuario_desativado_perde_acesso(client_anonimo, db_session, chaves_jwt):
    professor = criar_usuario(db_session, "prof@escola.com", TipoUsuario.PROFESSOR)
    headers = cabecalho(professor)
    professor.ativo = False
    db_session.commit()

    assert client_anonimo.get("/turmas", headers=headers).status_code == 401


def test_professor_promovido_ganha_acesso_de_admin_sem_novo_login(client_anonimo, db_session, chaves_jwt):
    # O tipo vem do banco a cada requisição, não do token
    professor = criar_usuario(db_session, "prof@escola.com", TipoUsuario.PROFESSOR)
    headers = cabecalho(professor)
    assert client_anonimo.get("/usuarios", headers=headers).status_code == 403

    professor.tipo = TipoUsuario.ADMIN
    db_session.commit()

    assert client_anonimo.get("/usuarios", headers=headers).status_code == 200


# ── Último admin ──────────────────────────────────────────────────────────────

@pytest.mark.parametrize("mudanca", [{"tipo": 1}, {"ativo": False}])
def test_nao_remove_o_ultimo_admin(client, db_session, mudanca):
    admin = criar_usuario(db_session, "admin@escola.com", TipoUsuario.ADMIN)

    response = client.patch(f"/usuarios/{admin.id}", json=mudanca)

    assert response.status_code == 400
    assert response.json()["detail"] == "Não é possível rebaixar ou desativar o último administrador ativo."


@pytest.mark.parametrize("mudanca", [{"tipo": 1}, {"ativo": False}])
def test_remove_admin_quando_existe_outro(client, db_session, mudanca):
    admin = criar_usuario(db_session, "admin@escola.com", TipoUsuario.ADMIN)
    criar_usuario(db_session, "outro-admin@escola.com", TipoUsuario.ADMIN)

    response = client.patch(f"/usuarios/{admin.id}", json=mudanca)

    assert response.status_code == 200


def test_admin_desativado_nao_conta_como_outro_admin(client, db_session):
    admin = criar_usuario(db_session, "admin@escola.com", TipoUsuario.ADMIN)
    criar_usuario(db_session, "inativo@escola.com", TipoUsuario.ADMIN, ativo=False)

    response = client.patch(f"/usuarios/{admin.id}", json={"tipo": 1})

    assert response.status_code == 400


def test_editar_nome_do_ultimo_admin_e_permitido(client, db_session):
    admin = criar_usuario(db_session, "admin@escola.com", TipoUsuario.ADMIN)

    response = client.patch(f"/usuarios/{admin.id}", json={"nome": "Coordenação"})

    assert response.status_code == 200
