import pytest
from unittest.mock import MagicMock
from app.schemas.turma import TurmaCreate, TurmaUpdate
from app.services import turma_service
from app.models.turma import Turma


def test_criar_turma_com_sucesso():
    db_mock = MagicMock()

    dados = TurmaCreate(
        nome="1º Ano A",
        ano=2026,
        turno="Matutino"
    )

    turma_esperada = Turma(
        id=1,
        nome="1º Ano A",
        ano=2026,
        turno="Matutino"
    )
    turma_service.turma_repository.criar_turma = MagicMock(return_value=turma_esperada)

    resultado = turma_service.criar_turma(db_mock, dados)

    assert resultado is not None
    assert resultado.id == 1
    assert resultado.nome == "1º Ano A"
    assert resultado.ano == 2026
    assert resultado.turno == "Matutino"

    turma_service.turma_repository.criar_turma.assert_called_once_with(db_mock, dados)


def test_listar_turmas_retorna_lista():
    db_mock = MagicMock()

    turmas_ficticias = [
        Turma(id=1, nome="1º Ano A", ano=2026, turno="Matutino"),
        Turma(id=2, nome="2º Ano B", ano=2026, turno="Vespertino"),
    ]
    turma_service.turma_repository.listar_turmas = MagicMock(return_value=turmas_ficticias)

    resultado = turma_service.listar_turmas(db_mock)

    assert len(resultado) == 2
    assert resultado[0].nome == "1º Ano A"
    assert resultado[1].nome == "2º Ano B"
    turma_service.turma_repository.listar_turmas.assert_called_once_with(db_mock)


def test_listar_turmas_vazia():
    db_mock = MagicMock()
    turma_service.turma_repository.listar_turmas = MagicMock(return_value=[])

    resultado = turma_service.listar_turmas(db_mock)

    assert resultado == []
    turma_service.turma_repository.listar_turmas.assert_called_once_with(db_mock)


def test_obter_turma_por_id_existente():
    db_mock = MagicMock()

    turma_ficticia = Turma(id=1, nome="3º Ano C", ano=2026, turno="Noturno")
    turma_service.turma_repository.buscar_turma_por_id = MagicMock(return_value=turma_ficticia)

    resultado = turma_service.obter_turma(db_mock, 1)

    assert resultado is not None
    assert resultado.id == 1
    assert resultado.nome == "3º Ano C"
    turma_service.turma_repository.buscar_turma_por_id.assert_called_once_with(db_mock, 1)


def test_obter_turma_por_id_inexistente():
    db_mock = MagicMock()
    turma_service.turma_repository.buscar_turma_por_id = MagicMock(return_value=None)

    resultado = turma_service.obter_turma(db_mock, 999)

    assert resultado is None
    turma_service.turma_repository.buscar_turma_por_id.assert_called_once_with(db_mock, 999)


def test_atualizar_turma_com_sucesso():
    db_mock = MagicMock()

    turma_ficticia = Turma(id=1, nome="Nome Antigo", ano=2025, turno="Matutino")
    turma_service.turma_repository.buscar_turma_por_id = MagicMock(return_value=turma_ficticia)

    turma_atualizada = Turma(id=1, nome="Nome Novo", ano=2026, turno="Noturno")
    turma_service.turma_repository.atualizar_turma = MagicMock(return_value=turma_atualizada)

    dados = TurmaUpdate(nome="Nome Novo", ano=2026, turno="Noturno")

    resultado = turma_service.atualizar_turma(db_mock, 1, dados)

    assert resultado is not None
    assert resultado.nome == "Nome Novo"
    assert resultado.ano == 2026
    assert resultado.turno == "Noturno"
    turma_service.turma_repository.atualizar_turma.assert_called_once_with(
        db_mock, turma_ficticia, {"nome": "Nome Novo", "ano": 2026, "turno": "Noturno"}
    )


def test_atualizar_turma_parcial():
    db_mock = MagicMock()

    turma_ficticia = Turma(id=1, nome="1º Ano A", ano=2026, turno="Matutino")
    turma_service.turma_repository.buscar_turma_por_id = MagicMock(return_value=turma_ficticia)

    turma_atualizada = Turma(id=1, nome="1º Ano A", ano=2026, turno="Vespertino")
    turma_service.turma_repository.atualizar_turma = MagicMock(return_value=turma_atualizada)

    dados = TurmaUpdate(turno="Vespertino")

    resultado = turma_service.atualizar_turma(db_mock, 1, dados)

    assert resultado is not None
    assert resultado.turno == "Vespertino"
    turma_service.turma_repository.atualizar_turma.assert_called_once_with(
        db_mock, turma_ficticia, {"turno": "Vespertino"}
    )


def test_atualizar_turma_inexistente_retorna_none():
    db_mock = MagicMock()
    turma_service.turma_repository.buscar_turma_por_id = MagicMock(return_value=None)
    turma_service.turma_repository.atualizar_turma = MagicMock()

    dados = TurmaUpdate(nome="Qualquer Nome")

    resultado = turma_service.atualizar_turma(db_mock, 999, dados)

    assert resultado is None
    turma_service.turma_repository.atualizar_turma.assert_not_called()
