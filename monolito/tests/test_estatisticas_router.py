"""GET /simulados/{id}/resumo: média de acertos e comparação com o simulado anterior."""
import pytest


def _criar_turma(client, nome):
    res = client.post("/turmas", json={"nome": nome, "ano": 2026, "turno": "Noturno"})
    assert res.status_code == 201
    return res.json()["id"]


def _criar_aluno(client, turma_id, nome):
    res = client.post(f"/turmas/{turma_id}/alunos", json={"nome": nome})
    assert res.status_code == 200
    return res.json()["id"]


def _criar_simulado(client, turmas_ids, data="2026-09-10", titulo="Simulado", gabarito="BADCE"):
    res = client.post("/simulados", json={
        "titulo": titulo,
        "data_aplicacao": data,
        "total_questoes": len(gabarito),
        "turmas_ids": turmas_ids,
    })
    assert res.status_code == 201
    simulado_id = res.json()["id"]
    res = client.put(
        f"/simulados/{simulado_id}/gabarito",
        json=[{"num_questao": i + 1, "alt_correta": alt} for i, alt in enumerate(gabarito)],
    )
    assert res.status_code == 200
    return simulado_id


def _corrigir(client, simulado_id, aluno_id, respostas):
    """`respostas` é uma string com uma alternativa por questão; '-' deixa a questão em branco."""
    payload = [
        {"questao": i + 1, "resposta_marcada": None if alt == "-" else alt}
        for i, alt in enumerate(respostas)
    ]
    res = client.put(f"/simulados/{simulado_id}/alunos/{aluno_id}", json={"respostas": payload})
    assert res.status_code == 200, res.text


def _resumo(client, simulado_id, turma_id=None):
    params = {"turma_id": turma_id} if turma_id is not None else {}
    return client.get(f"/simulados/{simulado_id}/resumo", params=params)


@pytest.fixture
def cenario(client):
    """Turma A (Bruno, Carla, Dani) e Turma B (Ana) no mesmo simulado, gabarito BADCE."""
    turma_a = _criar_turma(client, "Turma A")
    turma_b = _criar_turma(client, "Turma B")
    alunos = {
        "bruno": _criar_aluno(client, turma_a, "Bruno"),
        "carla": _criar_aluno(client, turma_a, "Carla"),
        "dani": _criar_aluno(client, turma_a, "Dani"),
        "ana": _criar_aluno(client, turma_b, "Ana"),
    }
    return {"turma_a": turma_a, "turma_b": turma_b, **alunos}


def test_simulado_sem_correcoes(client, cenario):
    simulado = _criar_simulado(client, [cenario["turma_a"]])

    res = _resumo(client, simulado)

    assert res.status_code == 200
    assert res.json() == {
        "simulado_id": simulado,
        "turma_id": None,
        "corrigidos": 0,
        "media_percentual": None,
        "anterior": None,
        "variacao_pp": None,
    }


def test_media_e_dos_percentuais_dos_alunos_corrigidos(client, cenario):
    simulado = _criar_simulado(client, [cenario["turma_a"], cenario["turma_b"]])
    _corrigir(client, simulado, cenario["bruno"], "BADCE")  # 100%
    _corrigir(client, simulado, cenario["carla"], "BADAA")  # 60%
    _corrigir(client, simulado, cenario["ana"], "BAAAA")    # 40%
    # Dani não foi corrigida: não entra na média.

    corpo = _resumo(client, simulado).json()

    assert corpo["corrigidos"] == 3
    assert corpo["media_percentual"] == pytest.approx(66.7)


def test_filtro_por_turma(client, cenario):
    simulado = _criar_simulado(client, [cenario["turma_a"], cenario["turma_b"]])
    _corrigir(client, simulado, cenario["bruno"], "BADCE")  # 100%
    _corrigir(client, simulado, cenario["carla"], "BADAA")  # 60%
    _corrigir(client, simulado, cenario["ana"], "BAAAA")    # 40%

    turma_a = _resumo(client, simulado, cenario["turma_a"]).json()
    turma_b = _resumo(client, simulado, cenario["turma_b"]).json()

    assert (turma_a["turma_id"], turma_a["corrigidos"], turma_a["media_percentual"]) == (cenario["turma_a"], 2, 80.0)
    assert (turma_b["turma_id"], turma_b["corrigidos"], turma_b["media_percentual"]) == (cenario["turma_b"], 1, 40.0)


def test_anulada_conta_acerto_e_branco_conta_erro(client, cenario):
    simulado = _criar_simulado(client, [cenario["turma_a"]])
    res = client.put(f"/simulados/{simulado}/gabarito", json=[{"num_questao": 5, "anulada": True}])
    assert res.status_code == 200
    _corrigir(client, simulado, cenario["bruno"], "BA--A")  # Q1, Q2 e Q5 (anulada) = 60%

    assert _resumo(client, simulado).json()["media_percentual"] == 60.0


def test_questao_sem_resposta_salva_conta_como_erro(client, cenario):
    simulado = _criar_simulado(client, [cenario["turma_a"]])
    _corrigir(client, simulado, cenario["bruno"], "B")  # só a Q1 salva: 1 de 5

    assert _resumo(client, simulado).json()["media_percentual"] == 20.0


def test_compara_com_o_anterior_que_tem_correcoes(client, cenario):
    turma_a = cenario["turma_a"]
    primeiro = _criar_simulado(client, [turma_a], data="2026-07-01", titulo="1º Simulado")
    _criar_simulado(client, [turma_a], data="2026-08-01", titulo="Sem correções")  # deve ser pulado
    atual = _criar_simulado(client, [turma_a], data="2026-09-01", titulo="3º Simulado")
    _corrigir(client, primeiro, cenario["bruno"], "BADAA")  # 60%
    _corrigir(client, atual, cenario["bruno"], "BADCA")     # 80%

    corpo = _resumo(client, atual).json()

    assert corpo["anterior"] == {"simulado_id": primeiro, "titulo": "1º Simulado", "media_percentual": 60.0}
    assert corpo["variacao_pp"] == 20.0


def test_variacao_negativa(client, cenario):
    turma_a = cenario["turma_a"]
    primeiro = _criar_simulado(client, [turma_a], data="2026-07-01")
    atual = _criar_simulado(client, [turma_a], data="2026-09-01")
    _corrigir(client, primeiro, cenario["bruno"], "BADCE")  # 100%
    _corrigir(client, atual, cenario["bruno"], "BAAAA")     # 40%

    assert _resumo(client, atual).json()["variacao_pp"] == -60.0


def test_simulados_posteriores_nao_sao_anteriores(client, cenario):
    turma_a = cenario["turma_a"]
    atual = _criar_simulado(client, [turma_a], data="2026-07-01")
    posterior = _criar_simulado(client, [turma_a], data="2026-09-01")
    _corrigir(client, atual, cenario["bruno"], "BADCE")
    _corrigir(client, posterior, cenario["bruno"], "BADCE")

    corpo = _resumo(client, atual).json()

    assert corpo["anterior"] is None
    assert corpo["variacao_pp"] is None


def test_mesma_data_desempata_pelo_id(client, cenario):
    turma_a = cenario["turma_a"]
    primeiro = _criar_simulado(client, [turma_a], data="2026-09-01")
    segundo = _criar_simulado(client, [turma_a], data="2026-09-01")
    _corrigir(client, primeiro, cenario["bruno"], "BADAA")
    _corrigir(client, segundo, cenario["bruno"], "BADCE")

    assert _resumo(client, segundo).json()["anterior"]["simulado_id"] == primeiro
    assert _resumo(client, primeiro).json()["anterior"] is None


def test_anterior_respeita_a_turma_filtrada(client, cenario):
    turma_a, turma_b = cenario["turma_a"], cenario["turma_b"]
    so_turma_b = _criar_simulado(client, [turma_b], data="2026-07-01", titulo="Só B")
    ambas = _criar_simulado(client, [turma_a, turma_b], data="2026-08-01", titulo="A e B")
    atual = _criar_simulado(client, [turma_a, turma_b], data="2026-09-01", titulo="Atual")
    _corrigir(client, so_turma_b, cenario["ana"], "BADCE")  # turma B: 100%
    _corrigir(client, ambas, cenario["ana"], "BAAAA")       # turma B: 40%
    _corrigir(client, ambas, cenario["bruno"], "BADAA")     # turma A: 60%
    _corrigir(client, atual, cenario["bruno"], "BADCE")     # turma A: 100%
    _corrigir(client, atual, cenario["ana"], "BADCE")       # turma B: 100%

    turma_a_resumo = _resumo(client, atual, turma_a).json()
    turma_b_resumo = _resumo(client, so_turma_b, turma_b).json()

    assert turma_a_resumo["anterior"]["simulado_id"] == ambas
    assert turma_a_resumo["anterior"]["media_percentual"] == 60.0
    assert turma_a_resumo["variacao_pp"] == 40.0
    assert turma_b_resumo["anterior"] is None


def test_anterior_considera_so_os_alunos_da_turma(client, cenario):
    turma_a, turma_b = cenario["turma_a"], cenario["turma_b"]
    anterior = _criar_simulado(client, [turma_a, turma_b], data="2026-08-01")
    atual = _criar_simulado(client, [turma_a, turma_b], data="2026-09-01")
    _corrigir(client, anterior, cenario["ana"], "BADCE")  # só a turma B foi corrigida no anterior
    _corrigir(client, atual, cenario["bruno"], "BADCE")

    assert _resumo(client, atual, turma_a).json()["anterior"] is None
    assert _resumo(client, atual).json()["anterior"]["simulado_id"] == anterior


def test_simulado_inexistente(client):
    res = _resumo(client, 999)

    assert res.status_code == 404
    assert res.json()["detail"] == "Simulado não encontrado"


def test_turma_nao_vinculada_ao_simulado(client, cenario):
    simulado = _criar_simulado(client, [cenario["turma_a"]])

    res = _resumo(client, simulado, cenario["turma_b"])

    assert res.status_code == 404
    assert res.json()["detail"] == "Turma não vinculada a este simulado"


# --------------------------------------------------------------------------- #
# GET /estatisticas/historico
# --------------------------------------------------------------------------- #

def _historico(client, turma_id=None, meses=None):
    params = {}
    if turma_id is not None:
        params["turma_id"] = turma_id
    if meses is not None:
        params["meses"] = meses
    return client.get("/estatisticas/historico", params=params)


def test_historico_vazio_sem_simulados_ou_sem_correcoes(client, cenario):
    _criar_simulado(client, [cenario["turma_a"]], data="2026-06-10")

    res = _historico(client)

    assert res.status_code == 200
    assert res.json() == {"turma_id": None, "pontos": []}


def test_historico_agrega_multiplos_simulados_no_mesmo_mes_e_ordena_cronologicamente(client, cenario):
    turma_a, turma_b = cenario["turma_a"], cenario["turma_b"]
    s_jun = _criar_simulado(client, [turma_a, turma_b], data="2026-06-15")
    s_mar_1 = _criar_simulado(client, [turma_a], data="2026-03-05")
    s_mar_2 = _criar_simulado(client, [turma_a], data="2026-03-25")
    _criar_simulado(client, [turma_a], data="2026-04-10")  # abril sem correções: não entra

    # Março: simulado 1 -> Bruno 100%, Carla 60%; simulado 2 -> Bruno 80% => média (100+60+80)/3 = 80%
    _corrigir(client, s_mar_1, cenario["bruno"], "BADCE")
    _corrigir(client, s_mar_1, cenario["carla"], "BADAA")
    _corrigir(client, s_mar_2, cenario["bruno"], "BADCA")
    # Junho: Ana 40%, Bruno 60% => média 50%
    _corrigir(client, s_jun, cenario["ana"], "BAAAA")
    _corrigir(client, s_jun, cenario["bruno"], "BADAA")

    corpo = _historico(client).json()

    assert corpo == {
        "turma_id": None,
        "pontos": [
            {"mes": "2026-03", "media_percentual": 80.0, "simulados": 2, "corrigidos": 3},
            {"mes": "2026-06", "media_percentual": 50.0, "simulados": 1, "corrigidos": 2},
        ],
    }


def test_historico_filtra_por_turma(client, cenario):
    turma_a, turma_b = cenario["turma_a"], cenario["turma_b"]
    s_mar = _criar_simulado(client, [turma_a], data="2026-03-05")
    s_jun = _criar_simulado(client, [turma_a, turma_b], data="2026-06-15")
    _corrigir(client, s_mar, cenario["bruno"], "BADCE")  # 100% (só turma A)
    _corrigir(client, s_jun, cenario["bruno"], "BADAA")  # 60% (turma A)
    _corrigir(client, s_jun, cenario["ana"], "BAAAA")    # 40% (turma B)

    corpo_b = _historico(client, turma_id=turma_b).json()

    assert corpo_b == {
        "turma_id": turma_b,
        "pontos": [
            {"mes": "2026-06", "media_percentual": 40.0, "simulados": 1, "corrigidos": 1},
        ],
    }


def test_historico_limita_quantidade_de_meses_aos_mais_recentes(client, cenario):
    turma_a = cenario["turma_a"]
    for mes, resp in [("01", "BAAAA"), ("02", "BADAA"), ("03", "BADCA"), ("04", "BADCE")]:
        sim = _criar_simulado(client, [turma_a], data=f"2026-{mes}-10")
        _corrigir(client, sim, cenario["bruno"], resp)

    corpo = _historico(client, meses=2).json()

    assert [p["mes"] for p in corpo["pontos"]] == ["2026-03", "2026-04"]


# --------------------------------------------------------------------------- #
# GET /simulados/{id}/questoes-erro
# --------------------------------------------------------------------------- #

def _questoes_erro(client, simulado_id, turma_id=None, limite=None):
    params = {}
    if turma_id is not None:
        params["turma_id"] = turma_id
    if limite is not None:
        params["limite"] = limite
    return client.get(f"/simulados/{simulado_id}/questoes-erro", params=params)


def test_questoes_erro_paridade_com_cenario_frontend(client, cenario):
    """Espelha o cenário de QuestoesErro.test.jsx: 3 corrigidos (2 na Turma A, 1 na Turma B), Q5 anulada."""
    simulado = _criar_simulado(client, [cenario["turma_a"], cenario["turma_b"]], gabarito="BADCE")
    res = client.put(f"/simulados/{simulado}/gabarito", json=[{"num_questao": 5, "anulada": True}])
    assert res.status_code == 200
    # Bruno (Turma A): acerta Q1, erra Q2, Q3, Q4 (Q5 anulada)
    _corrigir(client, simulado, cenario["bruno"], "BBBBB")
    # Carla (Turma A): acerta Q1 e Q3, erra Q2 e Q4
    _corrigir(client, simulado, cenario["carla"], "BBDAA")
    # Ana (Turma B): acerta todas
    _corrigir(client, simulado, cenario["ana"], "BADCE")
    # Dani (Turma A): não corrigida

    corpo = _questoes_erro(client, simulado).json()

    assert corpo == {
        "simulado_id": simulado,
        "turma_id": None,
        "corrigidos": 3,
        "questoes": [
            {"questao": 2, "erros": 2, "total": 3, "pct": 67},
            {"questao": 4, "erros": 2, "total": 3, "pct": 67},
            {"questao": 3, "erros": 1, "total": 3, "pct": 33},
            {"questao": 1, "erros": 0, "total": 3, "pct": 0},
        ],
    }


def test_questoes_erro_filtra_por_turma_e_aplica_limite(client, cenario):
    simulado = _criar_simulado(client, [cenario["turma_a"], cenario["turma_b"]], gabarito="BADCE")
    _corrigir(client, simulado, cenario["bruno"], "BBBBB")
    _corrigir(client, simulado, cenario["carla"], "BBDAA")
    _corrigir(client, simulado, cenario["ana"], "BADCE")

    turma_b = _questoes_erro(client, simulado, turma_id=cenario["turma_b"]).json()
    top_2 = _questoes_erro(client, simulado, limite=2).json()

    assert turma_b["corrigidos"] == 1
    assert all(q["erros"] == 0 and q["pct"] == 0 for q in turma_b["questoes"])
    assert [q["questao"] for q in top_2["questoes"]] == [2, 4]


def test_questoes_erro_arredonda_50_5_para_cima_e_sem_correcoes_retorna_vazio(client, cenario):
    simulado = _criar_simulado(client, [cenario["turma_a"]], gabarito="BA")
    assert _questoes_erro(client, simulado).json()["questoes"] == []

    _corrigir(client, simulado, cenario["bruno"], "BA")  # acerta Q1, acerta Q2
    _corrigir(client, simulado, cenario["carla"], "BB")  # acerta Q1, erra Q2 -> 1/2 = 50%

    corpo = _questoes_erro(client, simulado).json()
    assert corpo["questoes"] == [
        {"questao": 2, "erros": 1, "total": 2, "pct": 50},
        {"questao": 1, "erros": 0, "total": 2, "pct": 0},
    ]


# --------------------------------------------------------------------------- #
# Autenticação nas rotas de estatísticas
# --------------------------------------------------------------------------- #

@pytest.mark.parametrize("url", [
    "/simulados/1/resumo",
    "/simulados/1/questoes-erro",
    "/estatisticas/historico",
])
def test_estatisticas_exigem_autenticacao(client_anonimo, chaves_jwt, url):
    res = client_anonimo.get(url)
    assert res.status_code == 401
    assert res.json()["detail"] == "Token de acesso inválido ou ausente."




