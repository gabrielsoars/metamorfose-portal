from app.models.aluno import Aluno
from app.models.simulado import Gabarito, RespostaAluno, Simulado
from app.models.turma import Turma


def _criar_turma(client, nome="Turma A"):
    res = client.post("/turmas", json={"nome": nome, "ano": 2026, "turno": "Noturno"})
    assert res.status_code == 201
    return res.json()["id"]


def _criar_aluno(client, turma_id, nome):
    res = client.post(f"/turmas/{turma_id}/alunos", json={"nome": nome})
    assert res.status_code == 200
    return res.json()["id"]


def _criar_simulado(client, turmas_ids, titulo="Simulado 1", total_questoes=3):
    res = client.post("/simulados", json={
        "titulo": titulo,
        "data_aplicacao": "2026-09-10",
        "total_questoes": total_questoes,
        "turmas_ids": turmas_ids,
    })
    assert res.status_code == 201
    return res.json()["id"]


def _corrigir(client, simulado_id, aluno_id):
    res = client.put(
        f"/simulados/{simulado_id}/gabarito",
        json=[{"num_questao": i + 1, "alt_correta": alt} for i, alt in enumerate("ABC")],
    )
    assert res.status_code == 200
    res = client.put(
        f"/simulados/{simulado_id}/alunos/{aluno_id}",
        json={"respostas": [{"questao": 1, "resposta_marcada": "A"}, {"questao": 2, "resposta_marcada": "C"}]},
    )
    assert res.status_code == 200


# --------------------------------------------------------------------------- #
# DELETE /simulados/{id}
# --------------------------------------------------------------------------- #

def test_excluir_simulado_inexistente(client):
    res = client.delete("/simulados/999")
    assert res.status_code == 404
    assert res.json()["detail"] == "Simulado não encontrado"


def test_excluir_simulado_apaga_gabarito_e_respostas_mas_preserva_turma_e_aluno(client, db_session):
    turma = _criar_turma(client)
    aluno = _criar_aluno(client, turma, "Ana")
    simulado = _criar_simulado(client, [turma])
    outro = _criar_simulado(client, [turma], titulo="Outro")
    _corrigir(client, simulado, aluno)
    _corrigir(client, outro, aluno)
    assert db_session.query(RespostaAluno).count() == 4

    res = client.delete(f"/simulados/{simulado}")

    assert res.status_code == 204
    assert res.content == b""
    assert client.get(f"/simulados/{simulado}").status_code == 404
    assert client.get(f"/simulados/{simulado}/gabarito").status_code == 404
    assert db_session.query(Gabarito).filter(Gabarito.simulado_id == simulado).count() == 0
    # Só as respostas do simulado excluído somem; o outro simulado segue intacto
    assert db_session.query(RespostaAluno).count() == 2
    assert client.get(f"/simulados/{outro}/alunos/{aluno}").json()["nota"] == "1/3"
    assert [s["id"] for s in client.get("/simulados").json()] == [outro]
    # Turma e aluno permanecem
    assert client.get(f"/turmas/{turma}").status_code == 200
    assert client.get(f"/alunos/{aluno}").status_code == 200


def test_excluir_simulado_sem_gabarito_nem_turmas(client):
    simulado = _criar_simulado(client, [])
    assert client.delete(f"/simulados/{simulado}").status_code == 204
    assert client.get("/simulados").json() == []


# --------------------------------------------------------------------------- #
# DELETE /alunos/{id}
# --------------------------------------------------------------------------- #

def test_excluir_aluno_inexistente(client):
    res = client.delete("/alunos/999")
    assert res.status_code == 404
    assert res.json()["detail"] == "Aluno não encontrado."


def test_excluir_aluno_apaga_respostas_e_preserva_os_demais(client, db_session):
    turma = _criar_turma(client)
    ana = _criar_aluno(client, turma, "Ana")
    bruno = _criar_aluno(client, turma, "Bruno")
    simulado = _criar_simulado(client, [turma])
    _corrigir(client, simulado, ana)
    _corrigir(client, simulado, bruno)
    assert db_session.query(RespostaAluno).count() == 4

    res = client.delete(f"/alunos/{ana}")

    assert res.status_code == 204
    assert client.get(f"/alunos/{ana}").status_code == 404
    assert [a["nome"] for a in client.get(f"/turmas/{turma}/alunos").json()] == ["Bruno"]
    assert db_session.query(RespostaAluno).filter(RespostaAluno.aluno_id == ana).count() == 0
    assert db_session.query(RespostaAluno).filter(RespostaAluno.aluno_id == bruno).count() == 2
    lista = client.get(f"/simulados/{simulado}/alunos").json()
    assert [a["nome"] for a in lista["alunos"]] == ["Bruno"]
    # O simulado e o gabarito continuam
    assert client.get(f"/simulados/{simulado}/gabarito").status_code == 200


# --------------------------------------------------------------------------- #
# DELETE /turmas/{id}
# --------------------------------------------------------------------------- #

def test_excluir_turma_inexistente(client):
    res = client.delete("/turmas/999")
    assert res.status_code == 404
    assert res.json()["detail"] == "Turma não encontrada."


def test_excluir_turma_sem_simulados_apaga_alunos(client, db_session):
    turma = _criar_turma(client, "Turma A")
    outra = _criar_turma(client, "Turma B")
    _criar_aluno(client, turma, "Ana")
    _criar_aluno(client, turma, "Bruno")
    sobrevivente = _criar_aluno(client, outra, "Carla")

    res = client.delete(f"/turmas/{turma}")

    assert res.status_code == 204
    assert client.get(f"/turmas/{turma}").status_code == 404
    assert [t["id"] for t in client.get("/turmas").json()] == [outra]
    assert db_session.query(Aluno).filter(Aluno.turma_id == turma).count() == 0
    assert db_session.query(Aluno).filter(Aluno.id == sobrevivente).count() == 1


def test_excluir_turma_apaga_respostas_dos_alunos_de_simulado_que_ja_nao_a_usa(client, db_session):
    turma = _criar_turma(client)
    aluno = _criar_aluno(client, turma, "Ana")
    simulado = _criar_simulado(client, [turma])
    _corrigir(client, simulado, aluno)
    # Desvincula a turma do simulado (P-03) para poder excluí-la
    assert client.patch(f"/simulados/{simulado}", json={"turmas_ids": []}).status_code == 200

    assert client.delete(f"/turmas/{turma}").status_code == 204
    assert db_session.query(RespostaAluno).count() == 0
    assert db_session.query(Aluno).count() == 0
    # O simulado e o gabarito não ficam quebrados
    assert client.get(f"/simulados/{simulado}").status_code == 200
    assert client.get(f"/simulados/{simulado}/alunos").json() == {"total": 0, "alunos": []}
    assert len(client.get(f"/simulados/{simulado}/gabarito").json()) == 3


def test_excluir_turma_vinculada_a_simulado_retorna_409_e_nao_apaga_nada(client, db_session):
    turma = _criar_turma(client)
    aluno = _criar_aluno(client, turma, "Ana")
    simulado = _criar_simulado(client, [turma], titulo="1º Simulado ENEM")
    _criar_simulado(client, [turma], titulo="2º Simulado")
    _corrigir(client, simulado, aluno)

    res = client.delete(f"/turmas/{turma}")

    assert res.status_code == 409
    detalhe = res.json()["detail"]
    assert "2 simulado(s)" in detalhe
    assert "1º Simulado ENEM" in detalhe
    assert "2º Simulado" in detalhe
    # Nada foi apagado
    assert client.get(f"/turmas/{turma}").status_code == 200
    assert db_session.query(Turma).count() == 1
    assert db_session.query(Aluno).count() == 1
    assert db_session.query(RespostaAluno).count() == 2
    assert client.get(f"/simulados/{simulado}/alunos/{aluno}").json()["nota"] == "1/3"


def test_excluir_turma_liberada_depois_de_excluir_o_simulado(client):
    turma = _criar_turma(client)
    _criar_aluno(client, turma, "Ana")
    simulado = _criar_simulado(client, [turma])
    assert client.delete(f"/turmas/{turma}").status_code == 409

    assert client.delete(f"/simulados/{simulado}").status_code == 204
    assert client.delete(f"/turmas/{turma}").status_code == 204
    assert client.get("/turmas").json() == []


def test_excluir_simulado_nao_afeta_simulado_que_compartilha_a_turma(client):
    turma = _criar_turma(client)
    aluno = _criar_aluno(client, turma, "Ana")
    a = _criar_simulado(client, [turma], titulo="A")
    b = _criar_simulado(client, [turma], titulo="B")
    _corrigir(client, b, aluno)

    assert client.delete(f"/simulados/{a}").status_code == 204

    assert client.get(f"/simulados/{b}").json()["turmas"][0]["id"] == turma
    assert client.get(f"/simulados/{b}/alunos").json()["total"] == 1
