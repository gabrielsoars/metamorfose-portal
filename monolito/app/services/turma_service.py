from sqlalchemy.orm import Session

from ..models.turma import Turma
from ..repositories import aluno_repository, turma_repository
from ..schemas.turma import TurmaCreate, TurmaUpdate


class TurmaNaoEncontrada(Exception):
    pass


class TurmaComSimulados(Exception):
    """A turma não pode ser excluída enquanto estiver vinculada a simulados."""

    def __init__(self, titulos: list[str]):
        super().__init__(titulos)
        self.titulos = titulos


def listar_turmas(db: Session) -> list[Turma]:
    return turma_repository.listar_turmas(db)


def obter_turma(db: Session, turma_id: int) -> Turma | None:
    return turma_repository.buscar_turma_por_id(db, turma_id)

def criar_turma(db: Session, turma_in: TurmaCreate) -> Turma | None:
    return turma_repository.criar_turma(db, turma_in)

def atualizar_turma(db: Session, turma_id: int, turma_in: TurmaUpdate) -> Turma | None:
    turma = turma_repository.buscar_turma_por_id(db, turma_id)
    if turma is None:
        return None
    dados_atualizacao = turma_in.model_dump(exclude_unset=True)

    return turma_repository.atualizar_turma(db, turma, dados_atualizacao)

def excluir_turma(db: Session, turma_id: int) -> None:
    """Exclui a turma e seus alunos (com as respostas deles).

    Bloqueia (TurmaComSimulados) se a turma estiver vinculada a algum simulado,
    para não deixar simulados sem turma nem apagar correções por engano.
    """
    turma = turma_repository.buscar_turma_por_id(db, turma_id)
    if turma is None:
        raise TurmaNaoEncontrada(turma_id)
    if turma.simulados:
        raise TurmaComSimulados([s.titulo for s in turma.simulados])

    aluno_repository.excluir_por_turma(db, turma_id)
    turma_repository.excluir_turma(db, turma)
