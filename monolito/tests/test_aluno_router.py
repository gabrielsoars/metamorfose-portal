from app.core import security
from app.models.usuario import TipoUsuario, Usuario

CSV_CHAMADA_EXEMPLO = (
    '"FREQUÊNCIA\nMÉDIA DO\nCURSISTA0,",TURMA 1,SEMANA A,,,,,,,,,\r\n'
    ",,10/08,10/08,11/08,11/08,11/08,12/08,12/08,12/08,13/08,13/08\r\n"
    ",CURSISTA,SEG,SEG,TER,TER,TER,QUA,QUA,QUA,QUI,QUI\r\n"
    ",,GRAMATICA,FISICA I,INGLES,INGLES,GEO G,FILO,FORM P,HIST G,BIO G,F - Q\r\n"
    '"48,65%",Victor Breno Gregorio Vieira,TRUE,FALSE,FALSE,FALSE,FALSE,FALSE,TRUE,FALSE,TRUE,TRUE\r\n'
    '"18,92%",Alicia Suyane Bernardo de Souza,TRUE,TRUE,FALSE,FALSE,FALSE,FALSE,TRUE,FALSE,FALSE,FALSE\r\n'
    '"54,05%",Elizabeth Mendonça de Andrade,FALSE,FALSE,FALSE,TRUE,TRUE,FALSE,FALSE,TRUE,FALSE,TRUE\r\n'
)


def _criar_turma(client, nome="Turma 1"):
    res = client.post("/turmas", json={"nome": nome, "ano": 2026, "turno": "Manhã"})
    assert res.status_code == 201
    return res.json()["id"]


def test_importar_alunos_csv_sucesso(client):
    turma_id = _criar_turma(client)

    res = client.post(
        f"/turmas/{turma_id}/alunos/importar",
        files={"arquivo": ("chamada_turma1.csv", CSV_CHAMADA_EXEMPLO.encode("utf-8"), "text/csv")},
    )

    assert res.status_code == 201
    data = res.json()
    assert data["total_importados"] == 3
    assert data["ignorados"] == 0
    assert [a["nome"] for a in data["alunos"]] == [
        "Victor Breno Gregorio Vieira",
        "Alicia Suyane Bernardo de Souza",
        "Elizabeth Mendonça de Andrade",
    ]
    assert all(a["turma_id"] == turma_id and a["id"] is not None for a in data["alunos"])

    # Verifica persistência e ordenação alfabética na listagem da turma
    res_lista = client.get(f"/turmas/{turma_id}/alunos")
    assert res_lista.status_code == 200
    assert [a["nome"] for a in res_lista.json()] == [
        "Alicia Suyane Bernardo de Souza",
        "Elizabeth Mendonça de Andrade",
        "Victor Breno Gregorio Vieira",
    ]


def test_importar_alunos_csv_permite_nomes_repetidos_no_csv_e_na_turma(client):
    turma_id = _criar_turma(client)
    client.post(f"/turmas/{turma_id}/alunos", json={"nome": "Alicia Suyane Bernardo de Souza"})

    csv_com_repetidos = (
        ",CURSISTA,SEG\n"
        ",,GRAMATICA\n"
        '"18,92%",Alicia Suyane Bernardo de Souza,TRUE\n'
        '"91,89%",Alicia Suyane Bernardo de Souza,FALSE\n'
        '"51,35%",Clara Tiberio,TRUE\n'
    ).encode("utf-8")

    res = client.post(
        f"/turmas/{turma_id}/alunos/importar",
        files={"arquivo": ("chamada.csv", csv_com_repetidos, "text/csv")},
    )

    assert res.status_code == 201
    data = res.json()
    assert data["total_importados"] == 3
    assert data["ignorados"] == 0

    alunos_turma = client.get(f"/turmas/{turma_id}/alunos").json()
    assert len(alunos_turma) == 4
    assert [a["nome"] for a in alunos_turma].count("Alicia Suyane Bernardo de Souza") == 3


def test_importar_alunos_csv_ponto_e_virgula_latin1_com_linhas_ignoradas(client):
    turma_id = _criar_turma(client)
    conteudo_latin1 = (
        "FREQUÊNCIA MÉDIA DO CURSISTA;TURMA 1;SEMANA A\r\n"
        ";CURSISTA;SEG\r\n"
        ";;GRAMATICA\r\n"
        "72,97%;Eloah Victória Gizotti Francelino;VERDADEIRO\r\n"
        "0,00%;;FALSO\r\n"
        "2,70%;Rafael Rocha Lima Negrão;FALSO\r\n"
        ";;FALSO\r\n"
    ).encode("latin-1")

    res = client.post(
        f"/turmas/{turma_id}/alunos/importar",
        files={"arquivo": ("chamada_excel.csv", conteudo_latin1, "application/vnd.ms-excel")},
    )

    assert res.status_code == 201
    data = res.json()
    assert data["total_importados"] == 2
    assert data["ignorados"] == 2
    assert [a["nome"] for a in data["alunos"]] == [
        "Eloah Victória Gizotti Francelino",
        "Rafael Rocha Lima Negrão",
    ]


def test_importar_alunos_turma_inexistente(client):
    res = client.post(
        "/turmas/9999/alunos/importar",
        files={"arquivo": ("chamada.csv", CSV_CHAMADA_EXEMPLO.encode("utf-8"), "text/csv")},
    )

    assert res.status_code == 404
    assert res.json()["detail"] == "Turma não encontrada."


def test_importar_alunos_extensao_invalida(client):
    turma_id = _criar_turma(client)

    res = client.post(
        f"/turmas/{turma_id}/alunos/importar",
        files={"arquivo": ("chamada.xlsx", b"conteudo", "application/octet-stream")},
    )

    assert res.status_code == 400
    assert ".csv" in res.json()["detail"]


def test_importar_alunos_arquivo_vazio(client):
    turma_id = _criar_turma(client)

    res = client.post(
        f"/turmas/{turma_id}/alunos/importar",
        files={"arquivo": ("chamada.csv", b"", "text/csv")},
    )

    assert res.status_code == 400
    assert "vazio" in res.json()["detail"]


def test_importar_alunos_sem_coluna_cursista(client):
    turma_id = _criar_turma(client)
    csv_invalido = b"NOME,MATRICULA\nAna Silva,123\n"

    res = client.post(
        f"/turmas/{turma_id}/alunos/importar",
        files={"arquivo": ("alunos.csv", csv_invalido, "text/csv")},
    )

    assert res.status_code == 400
    assert "CURSISTA" in res.json()["detail"]


def test_importar_alunos_csv_apenas_cabecalho_sem_alunos(client):
    turma_id = _criar_turma(client)
    csv_sem_alunos = b",CURSISTA,SEG\n,,GRAMATICA\n,,FALSE\n"

    res = client.post(
        f"/turmas/{turma_id}/alunos/importar",
        files={"arquivo": ("chamada.csv", csv_sem_alunos, "text/csv")},
    )

    assert res.status_code == 400
    assert "Nenhum aluno válido" in res.json()["detail"]


def test_importar_alunos_sem_enviar_arquivo(client):
    turma_id = _criar_turma(client)

    res = client.post(f"/turmas/{turma_id}/alunos/importar")

    assert res.status_code == 422


# --------------------------------------------------------------------------- #
# Autenticação na importação de alunos por CSV
# --------------------------------------------------------------------------- #

def _criar_usuario(db_session, email="prof@escola.com", tipo=TipoUsuario.PROFESSOR, ativo=True):
    usuario = Usuario(
        nome=email.split("@")[0],
        email=email,
        tipo=tipo,
        senha_hash=security.gerar_hash("senha-forte-123"),
        ativo=ativo,
    )
    db_session.add(usuario)
    db_session.commit()
    return usuario


def _cabecalho_auth(usuario):
    return {"Authorization": f"Bearer {security.criar_access_token(usuario.id)}"}


def test_importar_alunos_sem_token_retorna_401(client_anonimo, chaves_jwt):
    res = client_anonimo.post(
        "/turmas/1/alunos/importar",
        files={"arquivo": ("chamada.csv", CSV_CHAMADA_EXEMPLO.encode("utf-8"), "text/csv")},
    )

    assert res.status_code == 401
    assert res.headers["www-authenticate"] == "Bearer"
    assert res.json()["detail"] == "Token de acesso inválido ou ausente."


def test_importar_alunos_token_invalido_retorna_401(client_anonimo, chaves_jwt):
    res = client_anonimo.post(
        "/turmas/1/alunos/importar",
        files={"arquivo": ("chamada.csv", CSV_CHAMADA_EXEMPLO.encode("utf-8"), "text/csv")},
        headers={"Authorization": "Bearer token-invalido"},
    )

    assert res.status_code == 401
    assert res.json()["detail"] == "Token de acesso inválido ou ausente."


def test_importar_alunos_usuario_inativo_retorna_401(client_anonimo, db_session, chaves_jwt):
    professor = _criar_usuario(db_session, ativo=False)

    res = client_anonimo.post(
        "/turmas/1/alunos/importar",
        files={"arquivo": ("chamada.csv", CSV_CHAMADA_EXEMPLO.encode("utf-8"), "text/csv")},
        headers=_cabecalho_auth(professor),
    )

    assert res.status_code == 401
    assert res.json()["detail"] == "Token de acesso inválido ou ausente."


def test_professor_autenticado_importa_alunos_csv(client_anonimo, db_session, chaves_jwt):
    professor = _criar_usuario(db_session, tipo=TipoUsuario.PROFESSOR, ativo=True)
    headers = _cabecalho_auth(professor)

    res_turma = client_anonimo.post(
        "/turmas",
        json={"nome": "Extensivo Noturno", "ano": 2026, "turno": "Noite"},
        headers=headers,
    )
    assert res_turma.status_code == 201
    turma_id = res_turma.json()["id"]

    res = client_anonimo.post(
        f"/turmas/{turma_id}/alunos/importar",
        files={"arquivo": ("chamada.csv", CSV_CHAMADA_EXEMPLO.encode("utf-8"), "text/csv")},
        headers=headers,
    )

    assert res.status_code == 201
    assert res.json()["total_importados"] == 3

    res_lista = client_anonimo.get(f"/turmas/{turma_id}/alunos", headers=headers)
    assert res_lista.status_code == 200
    assert [a["nome"] for a in res_lista.json()] == [
        "Alicia Suyane Bernardo de Souza",
        "Elizabeth Mendonça de Andrade",
        "Victor Breno Gregorio Vieira",
    ]


