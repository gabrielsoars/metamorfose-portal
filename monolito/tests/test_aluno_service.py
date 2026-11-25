import pytest
from unittest.mock import MagicMock

from app.models.aluno import Aluno
from app.models.turma import Turma
from app.schemas.aluno import AlunoCreate
from app.services import aluno_service


CSV_EXEMPLO_LISTA_CHAMADA = (
    '"FREQUÊNCIA\nMÉDIA DO\nCURSISTA0,",TURMA 1,SEMANA A,,,,,,,,,\r\n'
    ",,10/08,10/08,11/08,11/08,11/08,12/08,12/08,12/08,13/08,13/08\r\n"
    ",CURSISTA,SEG,SEG,TER,TER,TER,QUA,QUA,QUA,QUI,QUI\r\n"
    ",,GRAMATICA,FISICA I,INGLES,INGLES,GEO G,FILO,FORM P,HIST G,BIO G,F - Q\r\n"
    '"18,92%",Alicia Suyane Bernardo de Souza,TRUE,TRUE,FALSE,FALSE,FALSE,FALSE,TRUE,FALSE,FALSE,FALSE\r\n'
    '"91,89%",Amanda Dugolin Dorricio,TRUE,TRUE,TRUE,TRUE,TRUE,TRUE,TRUE,TRUE,TRUE,FALSE\r\n'
    '"54,05%",Elizabeth Mendonça de Andrade,FALSE,FALSE,FALSE,TRUE,TRUE,FALSE,FALSE,TRUE,FALSE,TRUE\r\n'
    '"72,97%",Eloah Victória Gizotti Francelino,TRUE,TRUE,FALSE,TRUE,TRUE,TRUE,TRUE,FALSE,TRUE,TRUE\r\n'
    '"2,70%",Rafael Rocha Lima Negrão,FALSE,FALSE,FALSE,FALSE,FALSE,FALSE,TRUE,FALSE,FALSE,FALSE\r\n'
)


def test_parsear_csv_modelo_lista_de_chamada_completo():
    resultado = aluno_service.parsear_csv_lista_chamada(
        CSV_EXEMPLO_LISTA_CHAMADA.encode("utf-8"),
        nome_arquivo="chamada_turma1.csv",
    )

    assert resultado.nomes == [
        "Alicia Suyane Bernardo de Souza",
        "Amanda Dugolin Dorricio",
        "Elizabeth Mendonça de Andrade",
        "Eloah Victória Gizotti Francelino",
        "Rafael Rocha Lima Negrão",
    ]
    assert resultado.ignorados == 0


def test_parsear_csv_delimitador_ponto_e_virgula_e_latin1():
    conteudo_csv = (
        "FREQUÊNCIA MÉDIA DO CURSISTA;TURMA 1;SEMANA A;;\r\n"
        ";;10/08;11/08;12/08\r\n"
        ";CURSISTA;SEG;TER;QUA\r\n"
        ";;GRAMATICA;INGLES;FILO\r\n"
        "54,05%;Elizabeth Mendonça de Andrade;FALSO;VERDADEIRO;FALSO\r\n"
        "72,97%;Eloah Victória Gizotti Francelino;VERDADEIRO;VERDADEIRO;VERDADEIRO\r\n"
        "2,70%;Rafael Rocha Lima Negrão;FALSO;FALSO;VERDADEIRO\r\n"
    ).encode("latin-1")

    resultado = aluno_service.parsear_csv_lista_chamada(conteudo_csv, "TURMA_1.CSV")

    assert resultado.nomes == [
        "Elizabeth Mendonça de Andrade",
        "Eloah Victória Gizotti Francelino",
        "Rafael Rocha Lima Negrão",
    ]
    assert resultado.ignorados == 0


def test_parsear_csv_utf8_com_bom():
    conteudo_csv = "CURSISTA,SEG\nClara Tiberio,TRUE\nPedro Volpe Santos,FALSE\n".encode("utf-8-sig")

    resultado = aluno_service.parsear_csv_lista_chamada(conteudo_csv, "lista.csv")

    assert resultado.nomes == ["Clara Tiberio", "Pedro Volpe Santos"]
    assert resultado.ignorados == 0


def test_parsear_csv_normaliza_espacos_e_permite_nomes_repetidos():
    conteudo_csv = (
        ",CURSISTA,SEG\n"
        '"27,03%",  Maria   Eduarda  Barbosa  ,TRUE\n'
        '"54,05%",Maria Eduarda Barbosa,FALSE\n'
    ).encode("utf-8")

    resultado = aluno_service.parsear_csv_lista_chamada(conteudo_csv, "lista.csv")

    assert resultado.nomes == ["Maria Eduarda Barbosa", "Maria Eduarda Barbosa"]
    assert resultado.ignorados == 0


def test_parsear_csv_contabiliza_linhas_ignoradas_e_pula_linhas_em_branco():
    conteudo_csv = (
        ",CURSISTA,SEG,TER\n"
        ",,GRAMATICA,FISICA I\n"
        '"18,92%",Alicia Suyane Bernardo de Souza,TRUE,TRUE\n'
        "\n"
        "   ,   ,   ,   \n"
        '"0,00%",,FALSE,FALSE\n'
        ",,FALSE,FALSE\n"
        '"10,00%",#REF!,FALSE,FALSE\n'
        '"10,00%",---,FALSE,FALSE\n'
        ",CURSISTA,SEG,TER\n"
        '"48,65%",Victor Breno Gregorio Vieira,TRUE,FALSE\n'
    ).encode("utf-8")

    resultado = aluno_service.parsear_csv_lista_chamada(conteudo_csv, "lista.csv")

    assert resultado.nomes == [
        "Alicia Suyane Bernardo de Souza",
        "Victor Breno Gregorio Vieira",
    ]
    assert resultado.ignorados == 5


@pytest.mark.parametrize("nome_arquivo", ["planilha.xlsx", "lista.txt", "foto.jpeg", ""])
def test_parsear_csv_extensao_invalida(nome_arquivo):
    with pytest.raises(aluno_service.ArquivoCSVInvalido, match=".csv"):
        aluno_service.parsear_csv_lista_chamada(b"CURSISTA\nAna\n", nome_arquivo=nome_arquivo)


@pytest.mark.parametrize("conteudo", [b"", b"   \r\n\t  "])
def test_parsear_csv_vazio(conteudo):
    with pytest.raises(aluno_service.ArquivoCSVInvalido, match="vazio"):
        aluno_service.parsear_csv_lista_chamada(conteudo, nome_arquivo="vazio.csv")


def test_parsear_csv_binario_invalido():
    conteudo_xlsx_falso = b"PK\x03\x04\x14\x00\x06\x00CURSISTA"
    with pytest.raises(aluno_service.ArquivoCSVInvalido, match="válido"):
        aluno_service.parsear_csv_lista_chamada(conteudo_xlsx_falso, nome_arquivo="disfarcado.csv")


def test_parsear_csv_sem_cabecalho_cursista():
    conteudo = b"NOME,EMAIL\nAna Clara,ana@escola.com\n"
    with pytest.raises(aluno_service.ArquivoCSVInvalido, match="CURSISTA"):
        aluno_service.parsear_csv_lista_chamada(conteudo, nome_arquivo="alunos.csv")


def test_parsear_csv_sem_alunos_validos():
    conteudo = (
        ",CURSISTA,SEG,TER\n"
        ",,GRAMATICA,FISICA I\n"
        ",,FALSE,FALSE\n"
    ).encode("utf-8")

    with pytest.raises(aluno_service.ArquivoCSVInvalido, match="Nenhum aluno válido"):
        aluno_service.parsear_csv_lista_chamada(conteudo, nome_arquivo="vazio_alunos.csv")


def test_importar_alunos_csv_turma_inexistente(monkeypatch):
    db_mock = MagicMock()
    monkeypatch.setattr(aluno_service.turma_repository, "buscar_turma_por_id", MagicMock(return_value=None))
    criar_lote_mock = MagicMock()
    monkeypatch.setattr(aluno_service.aluno_repository, "criar_alunos_em_lote", criar_lote_mock)

    with pytest.raises(aluno_service.TurmaNaoEncontrada):
        aluno_service.importar_alunos_csv(
            db_mock,
            turma_id=999,
            conteudo=CSV_EXEMPLO_LISTA_CHAMADA.encode("utf-8"),
            nome_arquivo="chamada.csv",
        )

    criar_lote_mock.assert_not_called()


def test_importar_alunos_csv_com_sucesso(monkeypatch):
    db_mock = MagicMock()
    turma = Turma(id=1, nome="Turma 1", ano=2026, turno="Manhã")
    monkeypatch.setattr(aluno_service.turma_repository, "buscar_turma_por_id", MagicMock(return_value=turma))

    alunos_persistidos = [
        Aluno(id=10, nome="Clara Tiberio", turma_id=1),
        Aluno(id=11, nome="Pedro Volpe Santos", turma_id=1),
    ]
    criar_lote_mock = MagicMock(return_value=alunos_persistidos)
    monkeypatch.setattr(aluno_service.aluno_repository, "criar_alunos_em_lote", criar_lote_mock)

    conteudo = (
        ",CURSISTA,SEG\n"
        ",,GRAMATICA\n"
        '"51,35%",Clara Tiberio,TRUE\n'
        ",,FALSE\n"
        '"32,43%",Pedro Volpe Santos,FALSE\n'
    ).encode("utf-8")

    resultado = aluno_service.importar_alunos_csv(
        db_mock,
        turma_id=1,
        conteudo=conteudo,
        nome_arquivo="chamada.csv",
    )

    assert resultado["total_importados"] == 2
    assert resultado["ignorados"] == 1
    assert resultado["alunos"] == alunos_persistidos
    criar_lote_mock.assert_called_once_with(
        db_mock,
        1,
        [AlunoCreate(nome="Clara Tiberio"), AlunoCreate(nome="Pedro Volpe Santos")],
    )

