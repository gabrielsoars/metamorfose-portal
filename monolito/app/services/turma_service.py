from sqlalchemy.orm import Session

from ..models.turma import Turma
from ..repositories import turma_repository
from ..schemas.turma import TurmaCreate, TurmaUpdate


def listar_turmas(db: Session) -> list[Turma]:
    return turma_repository.listar_turmas(db)


def obter_turma(db: Session, turma_id: int) -> Turma | None:
    return turma_repository.buscar_turma_por_id(db, turma_id)

def criar_turma(db: Session, turma_in: TurmaCreate) -> Turma | None:
    return turma_repository.criar_turma(db, turma_in)

def atualizar_turma(db: Session, turma_id: int, turma_in: TurmaUpdate) -> Turma | None:
    print("passou 1")
    turma = turma_repository.buscar_turma_por_id(db, turma_id)
    if turma is None:
        return None
    dados_atualizacao = turma_in.model_dump(exclude_unset=True)

    print("chamou repository")
    return turma_repository.atualizar_turma(db, turma, dados_atualizacao)
