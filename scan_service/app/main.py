"""
API de leitura de gabaritos — FastAPI + OpenCV

Endpoints:
  POST /processar          → JSON com respostas detectadas   (requer JWT)
  POST /processar/debug    → JSON + imagem anotada em base64 (requer JWT)
  GET  /health             → status da API                   (público)
"""

import logging
import cv2
import numpy as np
import base64
import io
from fastapi import Depends, FastAPI, File, UploadFile, HTTPException, Query
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from .auth import obter_usuario_id
from .gabarito import processar_gabarito

logger = logging.getLogger(__name__)

app = FastAPI(
    title="API de Gabaritos",
    description="Lê imagens de gabaritos e extrai as respostas marcadas usando OpenCV.",
    version="1.0.0"
)

# Libera CORS para o front poder chamar direto
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Schemas de resposta ────────────────────────────────────────────────────────

class QuestaoItem(BaseModel):
    questao: int
    resposta: Optional[str]     # None se não marcada
    confianca: float             # 0.0–1.0
    status: str                  # ok | sem_resposta | multipla_marcacao

class RespostaProcessar(BaseModel):
    sucesso: bool
    total_questoes: int
    questoes: list[QuestaoItem]
    sem_resposta: list[int]
    multipla_marcacao: list[int]
    avisos: list[str]

class RespostaDebug(RespostaProcessar):
    imagem_debug_base64: Optional[str]  # PNG anotado em base64


# ── Utilitários ───────────────────────────────────────────────────────────────

EXTENSOES_ACEITAS = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".webp"}

def carregar_imagem(arquivo: UploadFile) -> np.ndarray:
    """Lê UploadFile e converte para array numpy BGR."""
    import os
    ext = os.path.splitext(arquivo.filename or "")[-1].lower()
    if ext not in EXTENSOES_ACEITAS:
        raise HTTPException(
            status_code=400,
            detail=f"Formato não suportado: '{ext}'. Use: {', '.join(EXTENSOES_ACEITAS)}"
        )
    conteudo = arquivo.file.read()
    arr = np.frombuffer(conteudo, np.uint8)
    imagem = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if imagem is None:
        raise HTTPException(status_code=400, detail="Não foi possível decodificar a imagem.")
    return imagem

def imagem_para_base64(imagem: np.ndarray) -> str:
    """Converte array numpy para string PNG base64."""
    _, buffer = cv2.imencode(".png", imagem)
    return base64.b64encode(buffer).decode("utf-8")

def montar_avisos(sem_resposta: list[int], multipla: list[int]) -> list[str]:
    avisos = []
    if sem_resposta:
        qs = ", ".join(str(q) for q in sem_resposta)
        avisos.append(f"Questões sem resposta marcada: {qs}")
    if multipla:
        qs = ", ".join(str(q) for q in multipla)
        avisos.append(f"Questões com múltipla marcação (retornada a mais preenchida): {qs}")
    return avisos


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "versao": "1.0.0"}


@app.post("/processar", response_model=RespostaProcessar, summary="Processa gabarito")
async def processar(
    arquivo: UploadFile = File(..., description="Imagem do gabarito (JPG, PNG, etc.)"),
    num_alternativas: int = Query(5, ge=2, le=10, description="Alternativas por questão (padrão: 5)"),
    limiar_marcado: float = Query(0.25, ge=0.1, le=0.9, description="Sensibilidade de detecção (0.1–0.9)"),
    num_questoes: Optional[int] = Query(None, ge=1, description="Quantidade de questões da prova (padrão: todas do cartão)"),
    usuario_id: int = Depends(obter_usuario_id),
):
    """
    Recebe a imagem do gabarito e retorna as respostas detectadas em JSON.

    - **arquivo**: imagem do gabarito
    - **num_alternativas**: quantas colunas de bolhas existem (padrão 5 = A–E)
    - **limiar_marcado**: fração mínima de preenchimento para considerar marcada (padrão 0.25)
    - **num_questoes**: considera só as N primeiras questões do cartão
    """
    logger.info("Processando gabarito para usuario_id=%s", usuario_id)
    imagem = carregar_imagem(arquivo)
    resultado = processar_gabarito(
        imagem,
        num_alternativas=num_alternativas,
        limiar_marcado=limiar_marcado,
        num_questoes=num_questoes,
        gerar_debug=False
    )

    if resultado.total_questoes == 0:
        raise HTTPException(
            status_code=422,
            detail="Nenhuma bolha detectada. Verifique se a imagem está nítida e bem iluminada."
        )

    return RespostaProcessar(
        sucesso=True,
        total_questoes=resultado.total_questoes,
        questoes=[QuestaoItem(**q) for q in resultado.questoes],
        sem_resposta=resultado.sem_resposta,
        multipla_marcacao=resultado.multipla_marcacao,
        avisos=montar_avisos(resultado.sem_resposta, resultado.multipla_marcacao)
    )


@app.post("/processar/debug", response_model=RespostaDebug, summary="Processa com imagem anotada")
async def processar_debug(
    arquivo: UploadFile = File(...),
    num_alternativas: int = Query(5, ge=2, le=10),
    limiar_marcado: float = Query(0.25, ge=0.1, le=0.9),
    num_questoes: Optional[int] = Query(None, ge=1),
    usuario_id: int = Depends(obter_usuario_id),
):
    """
    Igual a /processar, mas também retorna a imagem original com as bolhas
    detectadas desenhadas (círculos verdes = marcadas, cinza = vazias, vermelho = conflito).
    Útil para debugar gabaritos com baixa qualidade ou mal fotografados.
    """
    logger.info("Processando gabarito para usuario_id=%s", usuario_id)
    imagem = carregar_imagem(arquivo)
    resultado = processar_gabarito(
        imagem,
        num_alternativas=num_alternativas,
        limiar_marcado=limiar_marcado,
        num_questoes=num_questoes,
        gerar_debug=True
    )

    if resultado.total_questoes == 0:
        raise HTTPException(status_code=422, detail="Nenhuma bolha detectada.")

    img_b64 = imagem_para_base64(resultado.imagem_debug) if resultado.imagem_debug is not None else None

    return RespostaDebug(
        sucesso=True,
        total_questoes=resultado.total_questoes,
        questoes=[QuestaoItem(**q) for q in resultado.questoes],
        sem_resposta=resultado.sem_resposta,
        multipla_marcacao=resultado.multipla_marcacao,
        avisos=montar_avisos(resultado.sem_resposta, resultado.multipla_marcacao),
        imagem_debug_base64=img_b64
    )
