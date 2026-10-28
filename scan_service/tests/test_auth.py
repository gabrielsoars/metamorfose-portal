import base64
import hashlib
import hmac
import json
from datetime import datetime, timedelta, timezone

import jwt
import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.auth import CLAIMS_OBRIGATORIAS, obter_usuario_id

ENDPOINTS_PROTEGIDOS = ["/processar", "/processar/debug"]


def validar(token):
    return obter_usuario_id(HTTPAuthorizationCredentials(scheme="Bearer", credentials=token))


def assert_rejeitado(token):
    with pytest.raises(HTTPException) as exc:
        validar(token)
    assert exc.value.status_code == 401
    assert exc.value.headers == {"WWW-Authenticate": "Bearer"}


def _b64url(dados: bytes) -> str:
    return base64.urlsafe_b64encode(dados).rstrip(b"=").decode()


# ── Validação do token ────────────────────────────────────────────────────────

def test_token_valido_retorna_usuario_id(criar_token):
    assert validar(criar_token(usuario_id=42)) == 42


def test_token_expirado_rejeitado(criar_token):
    agora = datetime.now(timezone.utc)
    assert_rejeitado(criar_token(iat=agora - timedelta(hours=2), exp=agora - timedelta(seconds=1)))


def test_token_assinado_com_outra_chave_rejeitado(criar_token, outro_par_rsa):
    assert_rejeitado(criar_token(chave=outro_par_rsa[0]))


def test_token_com_payload_alterado_rejeitado(criar_token):
    header, payload, assinatura = criar_token(usuario_id=42).split(".")
    dados = json.loads(base64.urlsafe_b64decode(payload + "=="))
    dados["sub"] = "1"
    assert_rejeitado(f"{header}.{_b64url(json.dumps(dados).encode())}.{assinatura}")


def test_token_com_assinatura_corrompida_rejeitado(criar_token):
    header, payload, assinatura = criar_token().split(".")
    corrompida = ("A" if assinatura[0] != "A" else "B") + assinatura[1:]
    assert_rejeitado(f"{header}.{payload}.{corrompida}")


def test_token_alg_none_rejeitado(criar_token):
    assert_rejeitado(criar_token(chave="", algoritmo="none"))


def test_token_rs512_rejeitado_quando_configurado_rs256(criar_token):
    # Mesmo assinado com a chave correta, algoritmo diferente do configurado é recusado
    assert_rejeitado(criar_token(algoritmo="RS512"))


def test_token_hs256_com_chave_publica_rejeitado(par_rsa):
    # Ataque de confusão de algoritmo: usa a chave pública (conhecida) como segredo HMAC
    agora = int(datetime.now(timezone.utc).timestamp())
    header = _b64url(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    payload = _b64url(json.dumps({
        "sub": "42", "iss": "metamorfose-monolito", "aud": "metamorfose-scan-service",
        "iat": agora, "exp": agora + 3600,
    }).encode())
    assinatura = hmac.new(par_rsa[1], f"{header}.{payload}".encode(), hashlib.sha256).digest()
    assert_rejeitado(f"{header}.{payload}.{_b64url(assinatura)}")


@pytest.mark.parametrize("claim", CLAIMS_OBRIGATORIAS)
def test_token_sem_claim_obrigatoria_rejeitado(criar_token, claim):
    assert_rejeitado(criar_token(remover=[claim]))


def test_token_emissor_incorreto_rejeitado(criar_token):
    assert_rejeitado(criar_token(iss="outro-emissor"))


def test_token_audiencia_incorreta_rejeitado(criar_token):
    assert_rejeitado(criar_token(aud="outro-servico"))


@pytest.mark.parametrize("sub", ["abc", "", "-1", "4.2"])
def test_token_sub_invalido_rejeitado(criar_token, sub):
    assert_rejeitado(criar_token(sub=sub))


def test_token_malformado_rejeitado():
    assert_rejeitado("nao-e-um-jwt")


# ── Proteção dos endpoints ────────────────────────────────────────────────────

def test_health_continua_publico(client):
    response = client.get("/health")
    assert response.status_code == 200


@pytest.mark.parametrize("endpoint", ENDPOINTS_PROTEGIDOS)
def test_endpoint_protegido_sem_token_retorna_401(client, endpoint):
    response = client.post(endpoint, files={"arquivo": ("g.png", b"x", "image/png")})
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


@pytest.mark.parametrize("endpoint", ENDPOINTS_PROTEGIDOS)
def test_endpoint_protegido_esquema_diferente_de_bearer_retorna_401(client, endpoint, criar_token):
    response = client.post(
        endpoint,
        files={"arquivo": ("g.png", b"x", "image/png")},
        headers={"Authorization": f"Basic {criar_token()}"},
    )
    assert response.status_code == 401


@pytest.mark.parametrize("endpoint", ENDPOINTS_PROTEGIDOS)
def test_endpoint_protegido_token_invalido_retorna_401(client, endpoint, criar_token, outro_par_rsa):
    response = client.post(
        endpoint,
        files={"arquivo": ("g.png", b"x", "image/png")},
        headers={"Authorization": f"Bearer {criar_token(chave=outro_par_rsa[0])}"},
    )
    assert response.status_code == 401


@pytest.mark.parametrize("endpoint", ENDPOINTS_PROTEGIDOS)
def test_endpoint_protegido_token_valido_passa_autenticacao(client, endpoint, criar_token):
    # Com token válido a requisição chega ao handler, que rejeita o arquivo (400), não a autenticação
    response = client.post(
        endpoint,
        files={"arquivo": ("g.txt", b"x", "text/plain")},
        headers={"Authorization": f"Bearer {criar_token()}"},
    )
    assert response.status_code == 400
    assert "Formato não suportado" in response.json()["detail"]


def test_handler_recebe_usuario_id_do_token(client, criar_token, caplog):
    import logging
    caplog.set_level(logging.INFO, logger="app.main")
    token = criar_token(usuario_id=7)

    client.post(
        "/processar",
        files={"arquivo": ("g.txt", b"x", "text/plain")},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert "usuario_id=7" in caplog.text
    # O token nunca aparece nos logs
    assert token not in caplog.text
