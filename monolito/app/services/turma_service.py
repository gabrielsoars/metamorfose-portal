from sqlalchemy.orm import Session

from ..models.turma import Turma
from ..repositories import turma_repository


def listar_turmas(db: Session) -> list[Turma]:
    return turma_repository.listar_turmas(db)


def obter_turma(db: Session, turma_id: int) -> Turma | None:
    return turma_repository.buscar_turma_por_id(db, turma_id)
