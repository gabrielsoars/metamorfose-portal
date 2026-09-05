"""
Módulo de processamento de gabaritos com OpenCV.

Fluxo:
1. Pré-processa a imagem (grayscale, threshold, morfologia)
2. Detecta a grade de bolhas via Hough Circles
3. Organiza bolhas por linha (questão) e coluna (alternativa)
4. Mede o preenchimento de cada bolha (pixel escuro = marcado)
5. Retorna {questao: N, resposta: "X"} para cada linha
"""

import cv2
import numpy as np
from dataclasses import dataclass
from typing import Optional


ALTERNATIVAS = ["A", "B", "C", "D", "E"]


@dataclass
class Bolha:
    x: int
    y: int
    raio: int
    preenchimento: float  # 0.0 a 1.0 — fração de pixels escuros


@dataclass
class ResultadoGabarito:
    questoes: list[dict]          # [{questao: 1, resposta: "B", confianca: 0.87}, ...]
    total_questoes: int
    sem_resposta: list[int]       # questões sem nenhuma bolha marcada
    multipla_marcacao: list[int]  # questões com mais de uma bolha marcada
    imagem_debug: Optional[np.ndarray] = None


def preprocessar(imagem: np.ndarray) -> np.ndarray:
    """
    Converte para cinza, aplica desfoque leve e threshold adaptativo.
    O threshold adaptativo lida melhor com iluminação irregular.
    """
    cinza = cv2.cvtColor(imagem, cv2.COLOR_BGR2GRAY)
    # Desfoque gaussiano para reduzir ruído antes do threshold
    desfocada = cv2.GaussianBlur(cinza, (5, 5), 0)
    # Threshold adaptativo: cada região usa sua própria média local
    binaria = cv2.adaptiveThreshold(
        desfocada, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        blockSize=11,
        C=2
    )
    # Morfologia para fechar buracos nas marcações
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    binaria = cv2.morphologyEx(binaria, cv2.MORPH_CLOSE, kernel)
    return binaria


def detectar_bolhas(imagem_original: np.ndarray, imagem_binaria: np.ndarray) -> list[Bolha]:
    """
    Usa HoughCircles para encontrar todos os círculos (bolhas) na imagem.
    Parâmetros calibrados para bolhas típicas de gabarito (5–20mm).
    """
    cinza = cv2.cvtColor(imagem_original, cv2.COLOR_BGR2GRAY)
    desfocada = cv2.GaussianBlur(cinza, (9, 9), 2)

    # Estima raio mínimo/máximo baseado no tamanho da imagem
    altura, largura = imagem_original.shape[:2]
    raio_min = max(8, int(min(altura, largura) * 0.012))
    raio_max = max(25, int(min(altura, largura) * 0.040))

    circulos = cv2.HoughCircles(
        desfocada,
        cv2.HOUGH_GRADIENT,
        dp=1.2,               # resolução do acumulador
        minDist=raio_min * 2, # distância mínima entre centros
        param1=50,            # threshold alto do Canny interno
        param2=28,            # limiar de votos no acumulador (menos = mais sensível)
        minRadius=raio_min,
        maxRadius=raio_max
    )

    if circulos is None:
        return []

    bolhas = []
    for (x, y, r) in np.round(circulos[0]).astype(int):
        # Mede preenchimento: cria máscara circular e conta pixels escuros na binária
        mascara = np.zeros(imagem_binaria.shape, dtype=np.uint8)
        cv2.circle(mascara, (x, y), r - 2, 255, -1)  # -2 para ignorar borda
        area_total = cv2.countNonZero(mascara)
        pixels_marcados = cv2.countNonZero(cv2.bitwise_and(imagem_binaria, mascara))
        preenchimento = pixels_marcados / area_total if area_total > 0 else 0.0
        bolhas.append(Bolha(x=x, y=y, raio=r, preenchimento=preenchimento))

    return bolhas


def agrupar_por_questao(bolhas: list[Bolha], num_alternativas: int = 5) -> list[list[Bolha]]:
    """
    Agrupa bolhas em linhas (questões) e ordena cada linha da esquerda para direita.
    Usa clusterização vertical por tolerância de posição Y.
    """
    if not bolhas:
        return []

    # Ordena por Y para facilitar agrupamento por linha
    bolhas_ordenadas = sorted(bolhas, key=lambda b: b.y)

    linhas: list[list[Bolha]] = []
    linha_atual: list[Bolha] = [bolhas_ordenadas[0]]

    # Tolerância vertical: bolhas na mesma questão têm Y similar
    tolerancia_y = bolhas_ordenadas[0].raio * 1.8

    for bolha in bolhas_ordenadas[1:]:
        media_y_linha = sum(b.y for b in linha_atual) / len(linha_atual)
        if abs(bolha.y - media_y_linha) <= tolerancia_y:
            linha_atual.append(bolha)
        else:
            # Só aceita linhas com o número certo de alternativas
            if len(linha_atual) == num_alternativas:
                linhas.append(sorted(linha_atual, key=lambda b: b.x))
            linha_atual = [bolha]

    if len(linha_atual) == num_alternativas:
        linhas.append(sorted(linha_atual, key=lambda b: b.x))

    return linhas


def determinar_resposta(
    bolhas_linha: list[Bolha],
    limiar_marcado: float = 0.35
) -> tuple[Optional[str], float, str]:
    """
    Para uma linha de bolhas, determina qual alternativa está marcada.
    Retorna: (resposta, confianca, status)
    status: 'ok' | 'sem_resposta' | 'multipla_marcacao'
    """
    marcadas = [b for b in bolhas_linha if b.preenchimento >= limiar_marcado]

    if len(marcadas) == 0:
        return None, 0.0, "sem_resposta"

    if len(marcadas) > 1:
        # Retorna a mais preenchida mas sinaliza conflito
        mais_preenchida = max(marcadas, key=lambda b: b.preenchimento)
        idx = bolhas_linha.index(mais_preenchida)
        return ALTERNATIVAS[idx] if idx < len(ALTERNATIVAS) else str(idx + 1), \
               mais_preenchida.preenchimento, "multipla_marcacao"

    bolha = marcadas[0]
    idx = bolhas_linha.index(bolha)
    letra = ALTERNATIVAS[idx] if idx < len(ALTERNATIVAS) else str(idx + 1)
    return letra, bolha.preenchimento, "ok"


def gerar_imagem_debug(
    imagem_original: np.ndarray,
    linhas: list[list[Bolha]],
    resultados: list[dict]
) -> np.ndarray:
    """
    Desenha círculos coloridos sobre o gabarito para visualizar a detecção:
    - Verde: bolha marcada (resposta detectada)
    - Cinza: bolha vazia
    - Vermelho: conflito (múltipla marcação)
    """
    debug = imagem_original.copy()

    for i, (linha, resultado) in enumerate(zip(linhas, resultados)):
        status = resultado.get("status", "ok")
        for j, bolha in enumerate(linha):
            marcada = bolha.preenchimento >= 0.35
            if status == "multipla_marcacao" and marcada:
                cor = (0, 0, 220)    # vermelho BGR
                espessura = 3
            elif marcada:
                cor = (50, 200, 50)  # verde
                espessura = 3
            else:
                cor = (160, 160, 160)  # cinza
                espessura = 1

            cv2.circle(debug, (bolha.x, bolha.y), bolha.raio, cor, espessura)

            # Número da questão ao lado esquerdo da primeira bolha
            if j == 0:
                cv2.putText(
                    debug, str(i + 1),
                    (bolha.x - bolha.raio * 3, bolha.y + 5),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (30, 30, 30), 1, cv2.LINE_AA
                )

    return debug


def processar_gabarito(
    imagem: np.ndarray,
    num_alternativas: int = 5,
    limiar_marcado: float = 0.35,
    gerar_debug: bool = False
) -> ResultadoGabarito:
    """
    Pipeline completo: recebe imagem numpy e retorna ResultadoGabarito.
    """
    binaria = preprocessar(imagem)
    bolhas = detectar_bolhas(imagem, binaria)

    if not bolhas:
        return ResultadoGabarito(
            questoes=[],
            total_questoes=0,
            sem_resposta=[],
            multipla_marcacao=[]
        )

    linhas = agrupar_por_questao(bolhas, num_alternativas)

    questoes = []
    sem_resposta = []
    multipla = []

    for i, linha in enumerate(linhas):
        num_questao = i + 1
        resposta, confianca, status = determinar_resposta(linha, limiar_marcado)

        questoes.append({
            "questao": num_questao,
            "resposta": resposta,
            "confianca": round(confianca, 3),
            "status": status
        })

        if status == "sem_resposta":
            sem_resposta.append(num_questao)
        elif status == "multipla_marcacao":
            multipla.append(num_questao)

    img_debug = None
    if gerar_debug:
        img_debug = gerar_imagem_debug(imagem, linhas, questoes)

    return ResultadoGabarito(
        questoes=questoes,
        total_questoes=len(linhas),
        sem_resposta=sem_resposta,
        multipla_marcacao=multipla,
        imagem_debug=img_debug
    )
