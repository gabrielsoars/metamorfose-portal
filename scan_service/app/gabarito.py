"""
Módulo de processamento de gabaritos com OpenCV.

Calibrado para o cartão-resposta do cursinho (6 blocos × 15 questões, A–E),
mas detecta automaticamente quantos blocos/linhas existem.

Fluxo:
1. Normaliza a largura da imagem (bolhas passam a ter tamanho previsível)
2. Detecta candidatos a bolha via Hough Circles
3. Encadeia círculos em "linhas de questão" (N bolhas alinhadas e equidistantes)
4. Encontra a maior sequência regular de linhas (descarta a legenda X/Y/Z)
5. Separa as linhas em blocos (colunas do cartão) e ajusta uma grade por bloco,
   prevendo a posição de todas as bolhas — inclusive as que o Hough não achou
6. Mede o preenchimento de cada bolha relativo ao branco do papel da linha
7. Retorna {questao: N, resposta: "X"} numerando bloco a bloco (1–15, 16–30, ...)
"""

import cv2
import numpy as np
from dataclasses import dataclass
from typing import Optional


ALTERNATIVAS = ["A", "B", "C", "D", "E"]

# Largura para a qual a imagem é redimensionada antes do processamento.
# Com o cartão ocupando a foto, as bolhas ficam com raio ~11px.
LARGURA_PADRAO = 1200
RAIO_MIN = 7
RAIO_MAX = 18


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


def normalizar(imagem: np.ndarray) -> np.ndarray:
    """Redimensiona para LARGURA_PADRAO mantendo a proporção."""
    escala = LARGURA_PADRAO / imagem.shape[1]
    interp = cv2.INTER_AREA if escala < 1 else cv2.INTER_CUBIC
    return cv2.resize(imagem, None, fx=escala, fy=escala, interpolation=interp)


def detectar_circulos(cinza: np.ndarray) -> np.ndarray:
    """
    Usa HoughCircles para encontrar candidatos a bolha.
    Retorna array (N, 3) com x, y, raio — já sem círculos de tamanho destoante.
    """
    desfocada = cv2.GaussianBlur(cinza, (5, 5), 1)
    circulos = cv2.HoughCircles(
        desfocada,
        cv2.HOUGH_GRADIENT,
        dp=1,
        minDist=RAIO_MIN * 2,
        param1=60,   # threshold alto do Canny interno
        param2=18,   # limiar de votos (menos = mais sensível; o filtro de linhas descarta o ruído)
        minRadius=RAIO_MIN,
        maxRadius=RAIO_MAX
    )
    if circulos is None:
        return np.empty((0, 3))

    circulos = circulos[0]
    raio_mediano = np.median(circulos[:, 2])
    return circulos[np.abs(circulos[:, 2] - raio_mediano) < raio_mediano * 0.3]


def encadear_linhas(circulos: np.ndarray, num_alternativas: int) -> list[np.ndarray]:
    """
    Encontra grupos de `num_alternativas` círculos alinhados horizontalmente e
    equidistantes — cada grupo é a linha de bolhas de uma questão.
    Texto e ruído raramente formam essa cadeia, então são descartados aqui.
    """
    if len(circulos) < num_alternativas:
        return []
    raio = float(np.median(circulos[:, 2]))
    pontos = circulos[np.argsort(circulos[:, 0]), :2]

    usados = np.zeros(len(pontos), dtype=bool)
    linhas = []

    for inicio in range(len(pontos)):
        if usados[inicio]:
            continue
        cadeia = [inicio]
        passo = None
        while len(cadeia) < num_alternativas:
            ux, uy = pontos[cadeia[-1]]
            dx = pontos[:, 0] - ux
            dy = np.abs(pontos[:, 1] - uy)
            ok = (dx > 1.6 * raio) & (dx < 3.2 * raio) & (dy < 0.8 * raio) & ~usados
            if passo is not None:
                ok &= np.abs(dx - passo) < 0.35 * passo
            candidatos = np.flatnonzero(ok)
            if len(candidatos) == 0:
                break
            prox = candidatos[np.argmin(dx[candidatos] + dy[candidatos])]
            if passo is None:
                passo = dx[prox]
            cadeia.append(prox)

        if len(cadeia) == num_alternativas:
            usados[cadeia] = True
            linhas.append(pontos[cadeia])

    return linhas


def estimar_inclinacao(linhas: list[np.ndarray]) -> float:
    """Ângulo (graus) da foto, pela mediana da inclinação das linhas de bolhas."""
    angulos = [
        np.degrees(np.arctan2(l[-1, 1] - l[0, 1], l[-1, 0] - l[0, 0]))
        for l in linhas
    ]
    return float(np.median(angulos))


def endireitar(imagem: np.ndarray, angulo: float) -> np.ndarray:
    """Gira a imagem para deixar as linhas de bolhas na horizontal."""
    altura, largura = imagem.shape[:2]
    matriz = cv2.getRotationMatrix2D((largura / 2, altura / 2), angulo, 1.0)
    return cv2.warpAffine(imagem, matriz, (largura, altura), borderMode=cv2.BORDER_REPLICATE)


def agrupar_em_grade(linhas: list[np.ndarray]) -> list[dict]:
    """
    Organiza as linhas encontradas em blocos (colunas do cartão).
    Retorna, por bloco, a lista de (indice_linha, pontos) e o total de linhas.

    - Linhas com Y parecido em blocos diferentes formam uma "fileira" global.
    - A maior sequência de fileiras com espaçamento regular é a grade de respostas;
      o resto (legenda X/Y/Z, ruído no cabeçalho) é descartado.
    """
    centros = np.array([l.mean(axis=0) for l in linhas])
    passo_bolha = float(np.median([np.median(np.diff(l[:, 0])) for l in linhas]))

    # Fileiras globais por Y
    ordem = np.argsort(centros[:, 1])
    fileiras: list[list[int]] = [[ordem[0]]]
    for idx in ordem[1:]:
        y_fileira = np.mean(centros[fileiras[-1], 1])
        if centros[idx, 1] - y_fileira < passo_bolha * 0.6:
            fileiras[-1].append(idx)
        else:
            fileiras.append([idx])

    ys = np.array([np.mean(centros[f, 1]) for f in fileiras])
    if len(ys) < 2:
        return []
    espacamento = float(np.median(np.diff(ys)))

    # Sequências regulares: quebra onde o salto é grande demais
    sequencias: list[list[int]] = [[0]]
    for i in range(1, len(ys)):
        if ys[i] - ys[i - 1] > espacamento * 1.5:
            sequencias.append([i])
        else:
            sequencias[-1].append(i)
    principal = max(sequencias, key=lambda s: sum(len(fileiras[i]) for i in s))

    # Índice da linha dentro da grade (tolera fileira inteira faltando)
    y0 = ys[principal[0]]
    indice_por_linha = {}
    for i in principal:
        indice = int(round((ys[i] - y0) / espacamento))
        for idx in fileiras[i]:
            indice_por_linha[idx] = indice
    total_linhas = max(indice_por_linha.values()) + 1

    # Blocos por X: separa onde há um vão maior que algumas bolhas
    na_grade = sorted(indice_por_linha, key=lambda idx: centros[idx, 0])
    blocos: list[list[int]] = [[na_grade[0]]]
    for idx in na_grade[1:]:
        x_bloco = np.mean(centros[blocos[-1], 0])
        if centros[idx, 0] - x_bloco > passo_bolha * 3:
            blocos.append([idx])
        else:
            blocos[-1].append(idx)

    return [
        {
            "linhas": [(indice_por_linha[idx], linhas[idx]) for idx in bloco],
            "total_linhas": total_linhas,
        }
        for bloco in blocos
    ]


def ajustar_bloco(bloco: dict, num_alternativas: int) -> np.ndarray:
    """
    Ajusta um modelo afim posição = origem + i·v_linha + j·v_coluna com as bolhas
    detectadas do bloco e prevê o centro de todas as bolhas.
    Retorna array (total_linhas, num_alternativas, 2).
    """
    A, X = [], []
    for i, pontos in bloco["linhas"]:
        for j, ponto in enumerate(pontos):
            A.append([1, i, j])
            X.append(ponto)
    A, X = np.array(A, dtype=float), np.array(X, dtype=float)

    if len({i for i, _ in bloco["linhas"]}) >= 2:
        coef, *_ = np.linalg.lstsq(A, X, rcond=None)
    else:
        # Só uma linha detectada: assume grade sem inclinação, espaçamento vertical ≈ 1.8× o horizontal
        coef, *_ = np.linalg.lstsq(A[:, [0, 2]], X, rcond=None)
        coef = np.array([coef[0], [0, abs(coef[1][0]) * 1.8], coef[1]])

    i, j = np.meshgrid(np.arange(bloco["total_linhas"]), np.arange(num_alternativas), indexing="ij")
    return coef[0] + i[..., None] * coef[1] + j[..., None] * coef[2]


def medir_brilho(cinza: np.ndarray, centros: np.ndarray, raio: float) -> np.ndarray:
    """
    Brilho médio do miolo de cada bolha de uma questão, dividido pelo branco do
    papel ao redor da linha — compensa sombra e variação de iluminação na foto.
    Retorna array (num_alternativas,) — ~1.0 = papel limpo, menor = mais escuro.
    """
    altura, largura = cinza.shape
    x0 = max(int(centros[:, 0].min() - raio * 1.5), 0)
    x1 = min(int(centros[:, 0].max() + raio * 1.5), largura)
    y0 = max(int(centros[:, 1].min() - raio * 1.5), 0)
    y1 = min(int(centros[:, 1].max() + raio * 1.5), altura)
    regiao = cinza[y0:y1, x0:x1]
    branco = max(float(np.percentile(regiao, 90)), 1.0) if regiao.size else 255.0

    brilhos = []
    raio_miolo = max(int(raio * 0.6), 2)
    for cx, cy in centros:
        mascara = np.zeros(cinza.shape, dtype=np.uint8)
        cv2.circle(mascara, (int(round(cx)), int(round(cy))), raio_miolo, 255, -1)
        pixels = cinza[mascara > 0]
        brilhos.append(float(pixels.mean()) / branco if pixels.size else 1.0)
    return np.array(brilhos)


def medir_preenchimento(
    cinza: np.ndarray,
    centros_por_questao: list[np.ndarray],
    raio: float
) -> list[list[Bolha]]:
    """
    Mede o preenchimento de todas as bolhas do cartão.

    As letras impressas dentro das bolhas (A–E) já escurecem a bolha vazia, e
    cada letra escurece de um jeito diferente. Por isso a referência de "vazia"
    é a mediana de cada alternativa no cartão inteiro (a maioria está vazia).
    preenchimento = quanto a bolha escureceu em relação a essa referência.
    Com a foto de exemplo: marcadas ≥ 0.3, vazias ≤ 0.2.
    """
    brilhos = np.array([medir_brilho(cinza, c, raio) for c in centros_por_questao])
    referencia = np.median(brilhos, axis=0)
    escurecimento = np.clip((referencia - brilhos) / referencia, 0.0, 1.0)

    return [
        [
            Bolha(x=int(round(x)), y=int(round(y)), raio=int(round(raio)), preenchimento=float(p))
            for (x, y), p in zip(centros, preenchimentos)
        ]
        for centros, preenchimentos in zip(centros_por_questao, escurecimento)
    ]


def determinar_resposta(
    bolhas_linha: list[Bolha],
    limiar_marcado: float = 0.25
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
    imagem: np.ndarray,
    linhas: list[list[Bolha]],
    resultados: list[dict],
    limiar_marcado: float
) -> np.ndarray:
    """
    Desenha círculos coloridos sobre o gabarito para visualizar a detecção:
    - Verde: bolha marcada (resposta detectada)
    - Cinza: bolha vazia
    - Vermelho: conflito (múltipla marcação)
    """
    debug = imagem.copy()

    for linha, resultado in zip(linhas, resultados):
        status = resultado.get("status", "ok")
        for j, bolha in enumerate(linha):
            marcada = bolha.preenchimento >= limiar_marcado
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
                    debug, str(resultado["questao"]),
                    (bolha.x - bolha.raio * 4, bolha.y + 5),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 220), 1, cv2.LINE_AA
                )

    return debug


def processar_gabarito(
    imagem: np.ndarray,
    num_alternativas: int = 5,
    limiar_marcado: float = 0.25,
    num_questoes: Optional[int] = None,
    gerar_debug: bool = False
) -> ResultadoGabarito:
    """
    Pipeline completo: recebe imagem numpy e retorna ResultadoGabarito.
    `num_questoes` limita o resultado às N primeiras questões (provas menores que o cartão).
    """
    vazio = ResultadoGabarito(questoes=[], total_questoes=0, sem_resposta=[], multipla_marcacao=[])

    imagem = normalizar(imagem)
    cinza = cv2.cvtColor(imagem, cv2.COLOR_BGR2GRAY)

    circulos = detectar_circulos(cinza)
    if len(circulos) < num_alternativas:
        return vazio

    linhas_detectadas = encadear_linhas(circulos, num_alternativas)
    if len(linhas_detectadas) < 2:
        return vazio

    # Foto torta: mesmo 2° desalinham as linhas entre blocos; endireita e detecta de novo
    angulo = estimar_inclinacao(linhas_detectadas)
    if abs(angulo) > 0.3:
        imagem = endireitar(imagem, angulo)
        cinza = cv2.cvtColor(imagem, cv2.COLOR_BGR2GRAY)
        circulos = detectar_circulos(cinza)
        linhas_detectadas = encadear_linhas(circulos, num_alternativas)
        if len(linhas_detectadas) < 2:
            return vazio

    blocos = agrupar_em_grade(linhas_detectadas)
    raio = float(np.median(circulos[:, 2]))

    # Numeração bloco a bloco, de cima para baixo: 1–15, 16–30, ...
    centros_por_questao = [
        centros_linha
        for bloco in blocos
        for centros_linha in ajustar_bloco(bloco, num_alternativas)
    ]
    if not centros_por_questao:
        return vazio

    # Mede o cartão inteiro antes de cortar: a referência de "vazia" usa todas as questões
    linhas = medir_preenchimento(cinza, centros_por_questao, raio)
    if num_questoes is not None:
        linhas = linhas[:num_questoes]

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
        img_debug = gerar_imagem_debug(imagem, linhas, questoes, limiar_marcado)

    return ResultadoGabarito(
        questoes=questoes,
        total_questoes=len(linhas),
        sem_resposta=sem_resposta,
        multipla_marcacao=multipla,
        imagem_debug=img_debug
    )
