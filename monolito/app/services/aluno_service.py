from sqlalchemy.orm import Session

from ..models.aluno import Aluno
from ..repositories import aluno_repository, turma_repository


class TurmaNaoEncontrada(Exception):
    pass


def listar_alunos_da_turma(db: Session, turma_id: int) -> list[Aluno]:
    if turma_repository.buscar_turma_por_id(db, turma_id) is None:
        raise TurmaNaoEncontrada(turma_id)
    return aluno_repository.listar_por_turma(db, turma_id)


def obter_aluno(db: Session, aluno_id: int) -> Aluno | None:
    return aluno_repository.buscar_por_id(db, aluno_id)
