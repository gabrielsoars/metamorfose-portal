import pytest
from unittest.mock import MagicMock
from app.services import usuario_service
from app.schemas.usuario import UsuarioCreate, UsuarioUpdate
from app.models.usuario import Usuario


def test_criar_usuario_com_sucesso():
    db_mock = MagicMock()

    dados = UsuarioCreate(
        nome="Teste",
        email="teste@email.com",
        materia="Teste",
        tipo=1
    )

    usuario_service.usuario_repository.buscar_por_email = MagicMock(return_value=None)

    usuario_esperado = Usuario(
        id=1,
        nome="Teste",
        email="teste@email.com",
        materia="Teste",
        tipo=1,
        ativo=False
    )
    usuario_service.usuario_repository.criar_usuario = MagicMock(return_value=usuario_esperado)

    resultado = usuario_service.criar_usuario(db_mock, dados)

    assert resultado is not None
    assert resultado.id == 1
    assert resultado.nome == "Teste"
    assert resultado.email == "teste@email.com"

    usuario_service.usuario_repository.criar_usuario.assert_called_once_with(db_mock, dados)


def test_impedir_cadastro_com_email_duplicado():
    db_mock = MagicMock()
    usuario_service.usuario_repository.criar_usuario = MagicMock()

    usuario_ficticio = Usuario(
        id=1,
        nome="Teste1",
        email="teste@email.com",
        tipo=1
    )
    usuario_service.usuario_repository.buscar_por_email = MagicMock(return_value=usuario_ficticio)

    dados = UsuarioCreate(
        nome="Teste",
        email="teste@email.com",
        materia="Teste",
        tipo=1
    )

    with pytest.raises(usuario_service.EmailJaCadastrado):
        usuario_service.criar_usuario(db_mock, dados)

    usuario_service.usuario_repository.criar_usuario.assert_not_called()


def test_impedir_ativacao_de_usuario_sem_senha():
    db_mock = MagicMock()

    usuario_ficticio = Usuario(
        id=1,
        nome="Teste",
        email="teste@email.com",
        materia="Teste",
        tipo=1,
        senha_hash=None,
        ativo=False
    )
    usuario_service.usuario_repository.buscar_por_id = MagicMock(return_value=usuario_ficticio)

    dados = UsuarioUpdate(ativo=True)

    with pytest.raises(usuario_service.UsuarioNaoPodeSerAtivado):
        usuario_service.atualizar_usuario(db_mock, 1, dados)


def test_permitir_reativacao_de_usuario_com_senha():
    db_mock = MagicMock()

    usuario_ficticio = Usuario(
        id=1,
        nome="Teste",
        email="teste@email.com",
        materia="Teste",
        tipo=1,
        senha_hash="hash_criptografado_valido",
        ativo=False
    )
    usuario_service.usuario_repository.buscar_por_id = MagicMock(return_value=usuario_ficticio)

    usuario_atualizado = Usuario(
        id=1,
        nome="Teste",
        email="teste@email.com",
        materia="Teste",
        tipo=1,
        senha_hash="hash_criptografado_valido",
        ativo=True
    )
    usuario_service.usuario_repository.atualizar_usuario = MagicMock(return_value=usuario_atualizado)

    dados = UsuarioUpdate(ativo=True)

    resultado = usuario_service.atualizar_usuario(db_mock, 1, dados)

    assert resultado is not None
    assert resultado.ativo is True
    usuario_service.usuario_repository.atualizar_usuario.assert_called_once_with(
        db_mock, usuario_ficticio, {"ativo": True}
    )


def test_atualizar_dados_sem_alterar_status_ativo():
    db_mock = MagicMock()

    usuario_ficticio = Usuario(
        id=1,
        nome="Nome Antigo",
        email="teste@email.com",
        materia="Matematica",
        tipo=1,
        senha_hash=None,
        ativo=False
    )
    usuario_service.usuario_repository.buscar_por_id = MagicMock(return_value=usuario_ficticio)

    usuario_atualizado = Usuario(
        id=1,
        nome="Nome Novo",
        email="teste@email.com",
        materia="Fisica",
        tipo=1,
        senha_hash=None,
        ativo=False
    )
    usuario_service.usuario_repository.atualizar_usuario = MagicMock(return_value=usuario_atualizado)

    dados = UsuarioUpdate(nome="Nome Novo", materia="Fisica")

    resultado = usuario_service.atualizar_usuario(db_mock, 1, dados)

    assert resultado is not None
    assert resultado.nome == "Nome Novo"
    assert resultado.materia == "Fisica"
    usuario_service.usuario_repository.atualizar_usuario.assert_called_once_with(
        db_mock, usuario_ficticio, {"nome": "Nome Novo", "materia": "Fisica"}
    )


def test_atualizar_usuario_inexistente_retorna_none():
    db_mock = MagicMock()
    usuario_service.usuario_repository.buscar_por_id = MagicMock(return_value=None)

    dados = UsuarioUpdate(nome="Qualquer Nome")

    resultado = usuario_service.atualizar_usuario(db_mock, 999, dados)

    assert resultado is None
