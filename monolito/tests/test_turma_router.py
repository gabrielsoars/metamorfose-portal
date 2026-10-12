def test_criar_turma_com_sucesso(client):
    payload = {
        "nome": "1º Ano A",
        "ano": 2026,
        "turno": "Matutino"
    }
    response = client.post("/turmas", json=payload)

    assert response.status_code == 201
    data = response.json()
    assert data["id"] is not None
    assert data["nome"] == "1º Ano A"
    assert data["ano"] == 2026
    assert data["turno"] == "Matutino"


def test_criar_turma_campos_obrigatorios_ausentes(client):
    payload = {"nome": "Turma Incompleta"}
    response = client.post("/turmas", json=payload)

    assert response.status_code == 422


def test_criar_turma_tipo_invalido(client):
    payload = {
        "nome": "Turma Inválida",
        "ano": "ano_nao_numerico",
        "turno": "Matutino"
    }
    response = client.post("/turmas", json=payload)

    assert response.status_code == 422


def test_listar_turmas_vazia(client):
    response = client.get("/turmas")

    assert response.status_code == 200
    assert response.json() == []


def test_listar_turmas(client):
    turma1 = {"nome": "2º Ano B", "ano": 2026, "turno": "Vespertino"}
    turma2 = {"nome": "1º Ano A", "ano": 2026, "turno": "Matutino"}

    client.post("/turmas", json=turma1)
    client.post("/turmas", json=turma2)

    response = client.get("/turmas")
    assert response.status_code == 200
    dados = response.json()
    assert len(dados) == 2
    # As turmas são ordenadas por nome no repositório
    assert dados[0]["nome"] == "1º Ano A"
    assert dados[1]["nome"] == "2º Ano B"


def test_obter_turma_por_id_existente(client):
    payload = {"nome": "3º Ano C", "ano": 2026, "turno": "Noturno"}
    create_res = client.post("/turmas", json=payload)
    turma_id = create_res.json()["id"]

    response = client.get(f"/turmas/{turma_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == turma_id
    assert data["nome"] == "3º Ano C"
    assert data["ano"] == 2026
    assert data["turno"] == "Noturno"


def test_obter_turma_por_id_inexistente(client):
    response = client.get("/turmas/9999")
    assert response.status_code == 404
    assert response.json()["detail"] == "Turma não encontrada."


def test_atualizar_turma_parcial(client):
    payload = {"nome": "1º Ano A", "ano": 2026, "turno": "Matutino"}
    create_res = client.post("/turmas", json=payload)
    turma_id = create_res.json()["id"]

    update_payload = {"turno": "Vespertino"}
    response = client.patch(f"/turmas/{turma_id}", json=update_payload)

    assert response.status_code == 200
    data = response.json()
    assert data["turno"] == "Vespertino"
    assert data["nome"] == "1º Ano A"
    assert data["ano"] == 2026


def test_atualizar_turma_todos_os_campos(client):
    payload = {"nome": "1º Ano A", "ano": 2026, "turno": "Matutino"}
    create_res = client.post("/turmas", json=payload)
    turma_id = create_res.json()["id"]

    update_payload = {"nome": "2º Ano B", "ano": 2027, "turno": "Noturno"}
    response = client.patch(f"/turmas/{turma_id}", json=update_payload)

    assert response.status_code == 200
    data = response.json()
    assert data["nome"] == "2º Ano B"
    assert data["ano"] == 2027
    assert data["turno"] == "Noturno"


def test_atualizar_turma_inexistente(client):
    response = client.patch("/turmas/9999", json={"nome": "Fantasma"})
    assert response.status_code == 404
    assert response.json()["detail"] == "Turma não encontrada."


def test_atualizar_turma_tipo_invalido(client):
    payload = {"nome": "1º Ano A", "ano": 2026, "turno": "Matutino"}
    create_res = client.post("/turmas", json=payload)
    turma_id = create_res.json()["id"]

    response = client.patch(f"/turmas/{turma_id}", json={"ano": "ano_invalido"})
    assert response.status_code == 422

