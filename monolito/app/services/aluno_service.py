from sqlalchemy.orm import Session

from ..models.aluno import Aluno
from ..repositories import aluno_repository, turma_repository
from ..schemas.aluno import AlunoCreate, AlunoUpdate


class TurmaNaoEncontrada(Exception):
    pass

class AlunoNaoEncontrado(Exception):
    pass

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

def atualizar_aluno(db: Session, aluno_id: int, aluno_in: AlunoUpdate) -> Aluno:
    aluno = aluno_repository.buscar_por_id(db, aluno_id)
    if aluno is None:
        raise AlunoNaoEncontrado(aluno_id)
    dados_atualizacao = aluno_in.model_dump(exclude_unset=True)
    if "turma_id" in dados_atualizacao:
        nova_turma_id = dados_atualizacao["turma_id"]
        buscar_turma(db, nova_turma_id)
    return aluno_repository.atualizar_aluno(db, aluno, dados_atualizacao)
