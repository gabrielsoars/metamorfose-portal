def test_criar_usuario_com_sucesso(client):
    payload = {
        "nome": "Professor Carlos",
        "email": "carlos@escola.com",
        "materia": "Historia",
        "tipo": 1,
    }
    response = client.post("/usuarios", json=payload)

    assert response.status_code == 201
    data = response.json()
    assert data["id"] is not None
    assert data["nome"] == "Professor Carlos"
    assert data["email"] == "carlos@escola.com"
    assert data["materia"] == "Historia"
    assert data["tipo"] == 1
    assert data["ativo"] is False


def test_criar_usuario_campos_obrigatorios_ausentes(client):
    # Envia payload sem e-mail e sem tipo
    payload = {"nome": "Incompleto"}
    response = client.post("/usuarios", json=payload)

    assert response.status_code == 422


def test_criar_usuario_email_invalido(client):
    payload = {
        "nome": "João",
        "email": "email_invalido_sem_arroba",
        "tipo": 1,
    }
    response = client.post("/usuarios", json=payload)

    assert response.status_code == 422


def test_criar_usuario_tipo_invalido(client):
    payload = {
        "nome": "Admin",
        "email": "admin@escola.com",
        "tipo": 99,  # Tipo fora de 0 (Admin) ou 1 (Professor)
    }
    response = client.post("/usuarios", json=payload)

    assert response.status_code == 422


def test_criar_usuario_email_duplicado(client):
    payload = {
        "nome": "Primeiro",
        "email": "duplicado@escola.com",
        "tipo": 1,
    }
    # Cria o primeiro usuário com sucesso
    res1 = client.post("/usuarios", json=payload)
    assert res1.status_code == 201

    # Tenta criar o segundo com o mesmo e-mail
    res2 = client.post("/usuarios", json=payload)
    assert res2.status_code == 400
    assert "Já existe um usuário cadastrado com este e-mail." in res2.json()["detail"]


def test_listar_usuarios(client):
    user1 = {"nome": "Usuario Um", "email": "um@escola.com", "tipo": 1}
    user2 = {"nome": "Usuario Dois", "email": "dois@escola.com", "tipo": 0}

    client.post("/usuarios", json=user1)
    client.post("/usuarios", json=user2)

    response = client.get("/usuarios")
    assert response.status_code == 200
    dados = response.json()
    assert len(dados) == 2


def test_obter_usuario_por_id_existente(client):
    payload = {"nome": "Ana Silva", "email": "ana@escola.com", "tipo": 1}
    create_res = client.post("/usuarios", json=payload)
    usuario_id = create_res.json()["id"]

    response = client.get(f"/usuarios/{usuario_id}")
    assert response.status_code == 200
    assert response.json()["id"] == usuario_id
    assert response.json()["nome"] == "Ana Silva"


def test_obter_usuario_por_id_inexistente(client):
    response = client.get("/usuarios/9999")
    assert response.status_code == 404
    assert response.json()["detail"] == "Usuário não encontrado."


def test_atualizar_usuario_parcial(client):
    payload = {"nome": "Nome Antigo", "email": "antigo@escola.com", "materia": "Biologia", "tipo": 1}
    create_res = client.post("/usuarios", json=payload)
    usuario_id = create_res.json()["id"]

    update_payload = {"nome": "Nome Atualizado"}
    response = client.patch(f"/usuarios/{usuario_id}", json=update_payload)

    assert response.status_code == 200
    data = response.json()
    assert data["nome"] == "Nome Atualizado"
    # Garante que os outros campos permaneceram intactos
    assert data["email"] == "antigo@escola.com"
    assert data["materia"] == "Biologia"


def test_tentar_ativar_usuario_sem_senha(client):
    payload = {"nome": "Inativo", "email": "inativo@escola.com", "tipo": 1}
    create_res = client.post("/usuarios", json=payload)
    usuario_id = create_res.json()["id"]

    # Tenta ativar o usuário sem ter cadastrado a senha
    patch_payload = {"ativo": True}
    response = client.patch(f"/usuarios/{usuario_id}", json=patch_payload)

    assert response.status_code == 400
    assert "Não é permitido ativar um usuário que ainda não concluiu o cadastro da senha" in response.json()["detail"]


def test_atualizar_usuario_inexistente(client):
    response = client.patch("/usuarios/9999", json={"nome": "Fantasma"})
    assert response.status_code == 404
    assert response.json()["detail"] == "Usuário não encontrado"
