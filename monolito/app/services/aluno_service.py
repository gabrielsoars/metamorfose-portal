import csv
import io
from typing import NamedTuple

from sqlalchemy.orm import Session

from ..models.aluno import Aluno
from ..repositories import aluno_repository, turma_repository
from ..schemas.aluno import AlunoCreate, AlunoUpdate

CABECALHO_CURSISTA = "CURSISTA"
VALORES_CHECKBOX = {"TRUE", "FALSE", "VERDADEIRO", "FALSO"}


class TurmaNaoEncontrada(Exception):
    pass

class AlunoNaoEncontrado(Exception):
    pass

class ArquivoCSVInvalido(Exception):
    pass

class ResultadoParseCSV(NamedTuple):
    nomes: list[str]
    ignorados: int


def _decodificar_conteudo_csv(conteudo: bytes) -> str:
    if conteudo.startswith((b"\xff\xfe", b"\xfe\xff")):
        try:
            return conteudo.decode("utf-16")
        except UnicodeDecodeError:
            raise ArquivoCSVInvalido("Não foi possível decodificar o arquivo CSV.")

    if b"\x00" in conteudo:
        raise ArquivoCSVInvalido("O arquivo enviado não é um CSV de texto válido.")

    for encoding in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            return conteudo.decode(encoding)
        except UnicodeDecodeError:
            continue

    raise ArquivoCSVInvalido("Não foi possível decodificar o arquivo CSV.")


def _ler_linhas_e_localizar_cabecalho(texto: str) -> tuple[list[list[str]], int, int]:
    candidatos: list[tuple[int, list[list[str]], int, int]] = []
    erro_csv = False

    for delimitador in (",", ";"):
        try:
            linhas = list(csv.reader(io.StringIO(texto), delimiter=delimitador))
        except csv.Error:
            erro_csv = True
            continue

        for idx_linha, linha in enumerate(linhas):
            for idx_col, celula in enumerate(linha):
                if celula.strip().upper() == CABECALHO_CURSISTA:
                    candidatos.append((len(linha), linhas, idx_linha, idx_col))
                    break
            else:
                continue
            break

    if not candidatos:
        if erro_csv:
            raise ArquivoCSVInvalido("Não foi possível processar o arquivo CSV: formato malformado.")
        raise ArquivoCSVInvalido("Cabeçalho 'CURSISTA' não encontrado no arquivo CSV.")

    candidatos.sort(key=lambda item: item[0], reverse=True)
    _, linhas, idx_linha, idx_col = candidatos[0]
    return linhas, idx_linha, idx_col


def _eh_linha_subcabecalho(linha: list[str], idx_col_cursista: int) -> bool:
    """Identifica linhas de subcabeçalho de disciplinas logo abaixo de CURSISTA na lista de chamada."""
    antes = [c.strip() for c in linha[:idx_col_cursista]]
    if any(antes):
        return False
    depois = [c.strip().upper() for c in linha[idx_col_cursista + 1:] if c.strip()]
    if not depois:
        return False
    return not all(valor in VALORES_CHECKBOX for valor in depois)


def parsear_csv_lista_chamada(
    conteudo: bytes,
    nome_arquivo: str | None = None,
) -> ResultadoParseCSV:
    if nome_arquivo is not None and not nome_arquivo.lower().endswith(".csv"):
        raise ArquivoCSVInvalido("Formato de arquivo inválido. Envie um arquivo .csv.")

    if not conteudo:
        raise ArquivoCSVInvalido("O arquivo CSV está vazio.")

    texto = _decodificar_conteudo_csv(conteudo)
    if not texto.strip():
        raise ArquivoCSVInvalido("O arquivo CSV está vazio.")

    linhas, idx_linha_cabecalho, idx_col_cursista = _ler_linhas_e_localizar_cabecalho(texto)

    nomes: list[str] = []
    ignorados = 0

    for linha in linhas[idx_linha_cabecalho + 1:]:
        if not linha or all(not celula.strip() for celula in linha):
            continue

        celula_cursista = linha[idx_col_cursista] if idx_col_cursista < len(linha) else ""
        nome = " ".join(celula_cursista.split())

        if not nome:
            if not nomes and _eh_linha_subcabecalho(linha, idx_col_cursista):
                continue
            ignorados += 1
            continue

        if (
            nome.upper() == CABECALHO_CURSISTA
            or nome.startswith("#")
            or not any(ch.isalpha() for ch in nome)
        ):
            ignorados += 1
            continue

        nomes.append(nome)

    if not nomes:
        raise ArquivoCSVInvalido("Nenhum aluno válido encontrado no arquivo CSV.")

    return ResultadoParseCSV(nomes=nomes, ignorados=ignorados)


def buscar_turma(db: Session, turma_id: int):
    if turma_repository.buscar_turma_por_id(db, turma_id) is None:
        raise TurmaNaoEncontrada(turma_id)

def listar_alunos_da_turma(db: Session, turma_id: int) -> list[Aluno]:
    buscar_turma(db, turma_id)
    return aluno_repository.listar_por_turma(db, turma_id)

def obter_aluno(db: Session, aluno_id: int) -> Aluno | None:
    return aluno_repository.buscar_por_id(db, aluno_id)

def criar_aluno(db: Session, turma_id: int, aluno_in: AlunoCreate) -> Aluno:
    buscar_turma(db, turma_id)
    return aluno_repository.criar_aluno(db, turma_id, aluno_in)

def importar_alunos_csv(
    db: Session,
    turma_id: int,
    conteudo: bytes,
    nome_arquivo: str | None = None,
) -> dict:
    buscar_turma(db, turma_id)
    resultado = parsear_csv_lista_chamada(conteudo, nome_arquivo)
    alunos_in = [AlunoCreate(nome=nome) for nome in resultado.nomes]
    alunos_criados = aluno_repository.criar_alunos_em_lote(db, turma_id, alunos_in)
    return {
        "total_importados": len(alunos_criados),
        "ignorados": resultado.ignorados,
        "alunos": alunos_criados,
    }

def atualizar_aluno(db: Session, aluno_id: int, aluno_in: AlunoUpdate) -> Aluno:
    aluno = aluno_repository.buscar_por_id(db, aluno_id)
    if aluno is None:
        raise AlunoNaoEncontrado(aluno_id)
    dados_atualizacao = aluno_in.model_dump(exclude_unset=True)
    if "turma_id" in dados_atualizacao:
        nova_turma_id = dados_atualizacao["turma_id"]
        buscar_turma(db, nova_turma_id)
    return aluno_repository.atualizar_aluno(db, aluno, dados_atualizacao)
