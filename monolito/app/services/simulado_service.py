from sqlalchemy.orm import Session

from ..models.simulado import Simulado, Gabarito
from ..models.turma import Turma
from ..schemas.simulado import SimuladoCreate, SimuladoUpdate, GabaritoCreate
from ..repositories import simulado_repository, turma_repository

class SimuladoNaoEncontrado(Exception):
    pass

class TurmaNaoEncontrada(Exception):
    pass

class GabaritoInvalido(Exception):
    pass

def _validar_e_buscar_turmas(db: Session, turmas_ids: list[int]) -> list[Turma]:
    if not turmas_ids:
        return []
    turmas = turma_repository.buscar_turmas_por_ids(db, turmas_ids)
    if len(turmas) != len(set(turmas_ids)):
        encontrados = {t.id for t in turmas}
        faltantes = list(set(turmas_ids) - encontrados)
        raise TurmaNaoEncontrada(faltantes)
    return turmas

def criar_simulado(db: Session, simulado_in: SimuladoCreate) -> Simulado:
    turmas = _validar_e_buscar_turmas(db, simulado_in.turmas_ids)
    return simulado_repository.criar_simulado(db, simulado_in, turmas)

def listar_simulados(db: Session) -> list[Simulado]:
    return simulado_repository.listar_simulado(db)

def obter_simulado(db: Session, simulado_id: int) -> Simulado | None:
    simulado = simulado_repository.obter_simulado(db, simulado_id)
    if simulado is None:
        raise SimuladoNaoEncontrado(simulado_id)
    return simulado

def atualizar_simulado(db: Session, simulado_id: int, simulado_in: SimuladoUpdate) -> Simulado:
    simulado = simulado_repository.obter_simulado(db, simulado_id)
    if simulado is None:
        raise SimuladoNaoEncontrado(simulado_id)
    dados_atualizacao = simulado_in.model_dump(exclude_unset=True)

    novas_turmas = None
    if "turmas_ids" in dados_atualizacao:
        turmas_ids = dados_atualizacao["turmas_ids"]
        novas_turmas = _validar_e_buscar_turmas(db, turmas_ids) if turmas_ids else []

    return simulado_repository.atualizar_simulado(db, simulado, dados_atualizacao, novas_turmas)

def obter_gabarito(db: Session, simulado_id: int) -> list[Gabarito]:
    simulado = simulado_repository.obter_simulado(db, simulado_id)
    if simulado is None:
        raise SimuladoNaoEncontrado(simulado_id)
    return simulado_repository.obter_gabarito(db, simulado_id)

def salvar_gabarito(
    db: Session,
    simulado_id: int,
    gabarito_in: list[GabaritoCreate] | GabaritoCreate
) -> list[Gabarito]:
    simulado = simulado_repository.obter_simulado(db, simulado_id)
    if simulado is None:
        raise SimuladoNaoEncontrado(simulado_id)

    itens = [gabarito_in] if isinstance(gabarito_in, GabaritoCreate) else gabarito_in

    if not itens:
        raise GabaritoInvalido("O gabarito não pode estar vazio.")

    numeros = [item.num_questao for item in itens]
    if len(numeros) != len(set(numeros)):
        raise GabaritoInvalido("Existem números de questões duplicados no gabarito enviado.")

    for item in itens:
        if item.num_questao < 1:
            raise GabaritoInvalido(f"Número de questão inválido: {item.num_questao}. Deve ser >= 1.")
        if simulado.total_questoes and item.num_questao > simulado.total_questoes:
            raise GabaritoInvalido(
                f"Questão {item.num_questao} excede o total de questões do simulado ({simulado.total_questoes})."
            )

    return simulado_repository.salvar_gabarito(db, simulado_id, itens)
