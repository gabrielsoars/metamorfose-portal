STATUS_CORRIGIDO = "CORRIGIDO"
STATUS_NAO_CORRIGIDO = "NÃO CORRIGIDO"


def _criar_turma(client, nome="Turma A - Noturno"):
    res = client.post("/turmas", json={"nome": nome, "ano": 2026, "turno": "Noturno"})
    assert res.status_code == 201
    return res.json()["id"]


def _criar_aluno(client, turma_id, nome):
    res = client.post(f"/turmas/{turma_id}/alunos", json={"nome": nome})
    assert res.status_code == 200
    return res.json()["id"]


def _criar_simulado(client, turmas_ids, total_questoes=5):
    res = client.post("/simulados", json={
        "titulo": "1º Simulado ENEM",
        "data_aplicacao": "2026-09-10",
        "total_questoes": total_questoes,
        "turmas_ids": turmas_ids,
    })
    assert res.status_code == 201
    return res.json()["id"]


def _cadastrar_gabarito(client, simulado_id, alternativas="BADCE"):
    payload = [
        {"num_questao": i + 1, "alt_correta": alt}
        for i, alt in enumerate(alternativas)
    ]
    res = client.put(f"/simulados/{simulado_id}/gabarito", json=payload)
    assert res.status_code == 200


def _cenario(client):
    """Duas turmas no simulado (gabarito BADCE) e uma turma fora dele."""
    turma_a = _criar_turma(client, "Turma A - Noturno")
    turma_b = _criar_turma(client, "Turma B - Matutino")
    turma_fora = _criar_turma(client, "Turma C - Fora")
    bruno = _criar_aluno(client, turma_a, "Bruno Lima")
    ana = _criar_aluno(client, turma_b, "Ana Paula Souza")
    carla = _criar_aluno(client, turma_a, "Carla Dias")
    intruso = _criar_aluno(client, turma_fora, "Zeca Fora")
    simulado_id = _criar_simulado(client, [turma_a, turma_b])
    _cadastrar_gabarito(client, simulado_id)
    return {
        "simulado_id": simulado_id,
        "turma_a": turma_a,
        "turma_b": turma_b,
        "ana": ana,
        "bruno": bruno,
        "carla": carla,
        "intruso": intruso,
    }


# --------------------------------------------------------------------------- #
# GET /simulados/{id}/alunos
# --------------------------------------------------------------------------- #

def test_listar_alunos_simulado_inexistente(client):
    res = client.get("/simulados/999/alunos")
    assert res.status_code == 404


def test_listar_alunos_simulado_sem_turmas(client):
    simulado_id = _criar_simulado(client, [])
    res = client.get(f"/simulados/{simulado_id}/alunos")
    assert res.status_code == 200
    assert res.json() == {"total": 0, "alunos": []}


def test_listar_alunos_ordem_alfabetica_e_status_nao_corrigido(client):
    c = _cenario(client)
    res = client.get(f"/simulados/{c['simulado_id']}/alunos")

    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 3
    assert [a["nome"] for a in data["alunos"]] == ["Ana Paula Souza", "Bruno Lima", "Carla Dias"]
    assert all(a["status"] == STATUS_NAO_CORRIGIDO for a in data["alunos"])
    assert all(a["nota"] is None for a in data["alunos"])
    assert data["alunos"][0]["turma"] == "Turma B - Matutino"
    assert data["alunos"][0]["turma_id"] == c["turma_b"]


def test_listar_alunos_exibe_status_corrigido_e_nota(client):
    c = _cenario(client)
    client.put(
        f"/simulados/{c['simulado_id']}/alunos/{c['bruno']}",
        json={"respostas": [
            {"questao": 1, "resposta_marcada": "B"},
            {"questao": 2, "resposta_marcada": "A"},
            {"questao": 3, "resposta_marcada": "A"},
        ]},
    )

    alunos = {a["id"]: a for a in client.get(f"/simulados/{c['simulado_id']}/alunos").json()["alunos"]}
    assert alunos[c["bruno"]]["status"] == STATUS_CORRIGIDO
    assert alunos[c["bruno"]]["nota"] == "2/5"
    assert alunos[c["ana"]]["status"] == STATUS_NAO_CORRIGIDO
    assert alunos[c["ana"]]["nota"] is None


def test_editar_gabarito_recalcula_nota(client):
    c = _cenario(client)
    url = f"/simulados/{c['simulado_id']}/alunos/{c['ana']}"
    client.put(url, json={"respostas": [{"questao": 3, "resposta_marcada": "A"}]})
    assert client.get(url).json()["nota"] == "0/5"

    client.put(f"/simulados/{c['simulado_id']}/gabarito", json={"num_questao": 3, "alt_correta": "A"})
    assert client.get(url).json()["nota"] == "1/5"


# --------------------------------------------------------------------------- #
# GET /simulados/{id}/alunos/{id}
# --------------------------------------------------------------------------- #

def test_obter_correcao_simulado_inexistente(client):
    res = client.get("/simulados/999/alunos/1")
    assert res.status_code == 404
    assert res.json()["detail"] == "Simulado não encontrado"


def test_obter_correcao_aluno_fora_das_turmas_do_simulado(client):
    c = _cenario(client)
    res = client.get(f"/simulados/{c['simulado_id']}/alunos/{c['intruso']}")
    assert res.status_code == 404
    assert res.json()["detail"] == "Aluno não encontrado nas turmas deste simulado"


def test_obter_correcao_aluno_inexistente(client):
    c = _cenario(client)
    res = client.get(f"/simulados/{c['simulado_id']}/alunos/999")
    assert res.status_code == 404


def test_obter_correcao_aluno_nao_corrigido(client):
    c = _cenario(client)
    res = client.get(f"/simulados/{c['simulado_id']}/alunos/{c['ana']}")

    assert res.status_code == 200
    data = res.json()
    assert data["simulado_id"] == c["simulado_id"]
    assert data["aluno"] == {"id": c["ana"], "nome": "Ana Paula Souza", "turma_id": c["turma_b"]}
    assert data["status"] == STATUS_NAO_CORRIGIDO
    assert data["acertos"] is None
    assert data["nota"] is None
    assert data["total_questoes"] == 5
    assert data["detalhamento"] == []


def test_obter_correcao_aluno_corrigido_lista_ordenada(client):
    c = _cenario(client)
    url = f"/simulados/{c['simulado_id']}/alunos/{c['carla']}"
    client.put(url, json={"respostas": [
        {"questao": 5, "resposta_marcada": "E"},
        {"questao": 1, "resposta_marcada": "B"},
        {"questao": 2, "resposta_marcada": "C"},
        {"questao": 3, "resposta_marcada": None},
    ]})

    res = client.get(url)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == STATUS_CORRIGIDO
    assert data["acertos"] == 2
    assert data["nota"] == "2/5"
    assert [d["questao"] for d in data["detalhamento"]] == [1, 2, 3, 4, 5]
    assert data["detalhamento"][0] == {
        "questao": 1, "resposta_aluno": "B", "resposta_correta": "B", "correto": True, "anulada": False
    }
    assert data["detalhamento"][1]["correto"] is False
    assert data["detalhamento"][2]["resposta_aluno"] is None
    assert data["detalhamento"][3]["resposta_aluno"] is None
    assert any("Questão 3" in aviso for aviso in data["avisos"])
    assert any("Questão 4" in aviso for aviso in data["avisos"])


# --------------------------------------------------------------------------- #
# PUT /simulados/{id}/alunos/{id}
# --------------------------------------------------------------------------- #

def test_registrar_respostas_aluno(client):
    c = _cenario(client)
    res = client.put(
        f"/simulados/{c['simulado_id']}/alunos/{c['ana']}",
        json={"respostas": [
            {"questao": 1, "resposta_marcada": "b"},
            {"questao": 2, "resposta_marcada": "A"},
            {"questao": 3, "resposta_marcada": "D"},
            {"questao": 4, "resposta_marcada": "C"},
            {"questao": 5, "resposta_marcada": "E"},
        ]},
    )

    assert res.status_code == 200
    data = res.json()
    assert data["status"] == STATUS_CORRIGIDO
    assert data["acertos"] == 5
    assert data["nota"] == "5/5"
    assert data["detalhamento"][0]["resposta_aluno"] == "B"
    assert data["avisos"] == []


def test_editar_respostas_aluno_ja_corrigido(client):
    c = _cenario(client)
    url = f"/simulados/{c['simulado_id']}/alunos/{c['ana']}"
    client.put(url, json={"respostas": [
        {"questao": 1, "resposta_marcada": "B"},
        {"questao": 3, "resposta_marcada": "A"},
    ]})

    # Edição pontual: troca a questão 3 de A para D sem afetar a questão 1
    res = client.put(url, json={"respostas": [{"questao": 3, "resposta_marcada": "D"}]})

    assert res.status_code == 200
    data = res.json()
    assert data["acertos"] == 2
    assert data["detalhamento"][0]["resposta_aluno"] == "B"
    assert data["detalhamento"][2]["resposta_aluno"] == "D"


def test_registrar_resposta_em_branco(client):
    c = _cenario(client)
    url = f"/simulados/{c['simulado_id']}/alunos/{c['ana']}"
    client.put(url, json={"respostas": [{"questao": 1, "resposta_marcada": "B"}]})

    res = client.put(url, json={"respostas": [{"questao": 1, "resposta_marcada": None}]})

    assert res.status_code == 200
    data = res.json()
    assert data["status"] == STATUS_CORRIGIDO
    assert data["acertos"] == 0
    assert data["detalhamento"][0]["resposta_aluno"] is None


def test_registrar_respostas_simulado_inexistente(client):
    res = client.put("/simulados/999/alunos/1", json={"respostas": [{"questao": 1, "resposta_marcada": "A"}]})
    assert res.status_code == 404


def test_registrar_respostas_aluno_fora_das_turmas(client):
    c = _cenario(client)
    res = client.put(
        f"/simulados/{c['simulado_id']}/alunos/{c['intruso']}",
        json={"respostas": [{"questao": 1, "resposta_marcada": "A"}]},
    )
    assert res.status_code == 404


def test_registrar_respostas_lista_vazia(client):
    c = _cenario(client)
    res = client.put(f"/simulados/{c['simulado_id']}/alunos/{c['ana']}", json={"respostas": []})
    assert res.status_code == 400


def test_registrar_respostas_questao_duplicada(client):
    c = _cenario(client)
    res = client.put(
        f"/simulados/{c['simulado_id']}/alunos/{c['ana']}",
        json={"respostas": [
            {"questao": 1, "resposta_marcada": "A"},
            {"questao": 1, "resposta_marcada": "B"},
        ]},
    )
    assert res.status_code == 400


def test_registrar_respostas_questao_excede_total(client):
    c = _cenario(client)
    res = client.put(
        f"/simulados/{c['simulado_id']}/alunos/{c['ana']}",
        json={"respostas": [{"questao": 6, "resposta_marcada": "A"}]},
    )
    assert res.status_code == 400


def test_registrar_respostas_sem_gabarito(client):
    turma = _criar_turma(client)
    aluno = _criar_aluno(client, turma, "Ana")
    simulado_id = _criar_simulado(client, [turma])

    res = client.put(
        f"/simulados/{simulado_id}/alunos/{aluno}",
        json={"respostas": [{"questao": 1, "resposta_marcada": "A"}]},
    )
    assert res.status_code == 400
    assert "gabarito" in res.json()["detail"]


def test_registrar_respostas_alternativa_invalida(client):
    c = _cenario(client)
    res = client.put(
        f"/simulados/{c['simulado_id']}/alunos/{c['ana']}",
        json={"respostas": [{"questao": 1, "resposta_marcada": "Z"}]},
    )
    assert res.status_code == 422



# --------------------------------------------------------------------------- #
# Questões anuladas (regra: contam como acerto para todos os alunos corrigidos)
# --------------------------------------------------------------------------- #

def _anular(client, simulado_id, num_questao, anulada=True, **extra):
    return client.put(
        f"/simulados/{simulado_id}/gabarito",
        json={"num_questao": num_questao, "anulada": anulada, **extra},
    )


def test_anular_questao_preserva_alternativa(client):
    c = _cenario(client)
    res = _anular(client, c["simulado_id"], 3)

    assert res.status_code == 200
    q3 = next(g for g in res.json() if g["num_questao"] == 3)
    assert q3["anulada"] is True
    assert q3["alt_correta"] == "D"
    assert all(g["anulada"] is False for g in res.json() if g["num_questao"] != 3)


def test_alterar_alternativa_sem_informar_anulada_mantem_estado(client):
    c = _cenario(client)
    _anular(client, c["simulado_id"], 3)

    res = client.put(f"/simulados/{c['simulado_id']}/gabarito", json={"num_questao": 3, "alt_correta": "A"})

    q3 = next(g for g in res.json() if g["num_questao"] == 3)
    assert q3["anulada"] is True
    assert q3["alt_correta"] == "A"


def test_cadastrar_questao_anulada_sem_alternativa(client):
    turma = _criar_turma(client)
    simulado_id = _criar_simulado(client, [turma])

    res = _anular(client, simulado_id, 1)

    assert res.status_code == 200
    assert res.json()[0]["alt_correta"] is None
    assert res.json()[0]["anulada"] is True


def test_cadastrar_questao_sem_alternativa_e_sem_anular(client):
    turma = _criar_turma(client)
    simulado_id = _criar_simulado(client, [turma])

    res = client.put(f"/simulados/{simulado_id}/gabarito", json={"num_questao": 1})

    assert res.status_code == 400


def test_reativar_questao_anulada_sem_alternativa_exige_alternativa(client):
    turma = _criar_turma(client)
    simulado_id = _criar_simulado(client, [turma])
    _anular(client, simulado_id, 1)

    res = _anular(client, simulado_id, 1, anulada=False)
    assert res.status_code == 400

    res = _anular(client, simulado_id, 1, anulada=False, alt_correta="c")
    assert res.status_code == 200
    assert res.json()[0] == {
        "num_questao": 1, "alt_correta": "C", "anulada": False,
        "id": res.json()[0]["id"], "simulado_id": simulado_id,
    }


def test_questao_anulada_conta_como_acerto(client):
    c = _cenario(client)
    url = f"/simulados/{c['simulado_id']}/alunos/{c['ana']}"
    client.put(url, json={"respostas": [
        {"questao": 1, "resposta_marcada": "B"},
        {"questao": 2, "resposta_marcada": "E"},
        {"questao": 3, "resposta_marcada": "A"},
    ]})
    assert client.get(url).json()["nota"] == "1/5"

    # Anular a questão 2 (respondida errada) e a 4 (em branco) recalcula a nota
    client.put(f"/simulados/{c['simulado_id']}/gabarito", json=[
        {"num_questao": 2, "anulada": True},
        {"num_questao": 4, "anulada": True},
    ])

    data = client.get(url).json()
    assert data["acertos"] == 3
    assert data["nota"] == "3/5"
    q2, q4 = data["detalhamento"][1], data["detalhamento"][3]
    assert q2 == {"questao": 2, "resposta_aluno": "E", "resposta_correta": "A", "correto": True, "anulada": True}
    assert q4["correto"] is True and q4["resposta_aluno"] is None
    assert "Questão 2: anulada — contabilizada como acerto." in data["avisos"]
    assert not any("Questão 4: sem resposta" in aviso for aviso in data["avisos"])
    assert any("Questão 5: sem resposta" in aviso for aviso in data["avisos"])

    alunos = {a["id"]: a for a in client.get(f"/simulados/{c['simulado_id']}/alunos").json()["alunos"]}
    assert alunos[c["ana"]]["nota"] == "3/5"


def test_questao_anulada_nao_pontua_aluno_nao_corrigido(client):
    c = _cenario(client)
    _anular(client, c["simulado_id"], 1)

    data = client.get(f"/simulados/{c['simulado_id']}/alunos/{c['bruno']}").json()
    assert data["status"] == STATUS_NAO_CORRIGIDO
    assert data["nota"] is None


def test_reativar_questao_recalcula_nota(client):
    c = _cenario(client)
    url = f"/simulados/{c['simulado_id']}/alunos/{c['ana']}"
    _anular(client, c["simulado_id"], 1)
    client.put(url, json={"respostas": [{"questao": 1, "resposta_marcada": "E"}]})
    assert client.get(url).json()["nota"] == "1/5"

    _anular(client, c["simulado_id"], 1, anulada=False)

    assert client.get(url).json()["nota"] == "0/5"


def test_registrar_resposta_em_questao_anulada(client):
    turma = _criar_turma(client)
    aluno = _criar_aluno(client, turma, "Ana")
    simulado_id = _criar_simulado(client, [turma], total_questoes=1)
    _anular(client, simulado_id, 1)

    res = client.put(
        f"/simulados/{simulado_id}/alunos/{aluno}",
        json={"respostas": [{"questao": 1, "resposta_marcada": "A"}]},
    )

    assert res.status_code == 200
    assert res.json()["nota"] == "1/1"
    assert res.json()["detalhamento"][0]["resposta_correta"] is None
