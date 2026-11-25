from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models.aluno import Aluno
from ..models.turma import Turma
from ..schemas.turma import TurmaCreate, TurmaUpdate


def _popular_contagem_alunos(db: Session, turmas: list[Turma]) -> list[Turma]:
    if not turmas:
        return turmas
    ids = [t.id for t in turmas]
    contagens = dict(
        db.query(Aluno.turma_id, func.count(Aluno.id))
        .filter(Aluno.turma_id.in_(ids))
        .group_by(Aluno.turma_id)
        .all()
    )
    for t in turmas:
        t.alunos = contagens.get(t.id, 0)
    return turmas


def listar_turmas(db: Session) -> list[Turma]:
    turmas = db.query(Turma).order_by(Turma.nome).all()
    return _popular_contagem_alunos(db, turmas)


def buscar_turma_por_id(db: Session, turma_id: int) -> Turma | None:
    turma = db.query(Turma).filter(Turma.id == turma_id).first()
    if turma is not None:
        _popular_contagem_alunos(db, [turma])
    return turma


def buscar_turmas_por_ids(db: Session, turmas_ids: list[int]) -> list[Turma]:
    turmas = db.query(Turma).filter(Turma.id.in_(turmas_ids)).all()
    return _popular_contagem_alunos(db, turmas)

def criar_turma(db: Session, turma_in: TurmaCreate) -> Turma | None:
    nova_turma = Turma(
        nome=turma_in.nome,
        ano=turma_in.ano,
        turno=turma_in.turno
    )
    db.add(nova_turma)
    db.commit()
    db.refresh(nova_turma)
    nova_turma.alunos = 0
    return nova_turma

def atualizar_turma(db: Session, turma: Turma, dados_atualizacao: dict):
    for campo, valor in dados_atualizacao.items():
        setattr(turma, campo, valor)
    
    db.commit()
    db.refresh(turma)
    _popular_contagem_alunos(db, [turma])
    return turma

def excluir_turma(db: Session, turma: Turma) -> None:
    """Apaga a turma; os alunos devem ser apagados antes (aluno_repository.excluir_por_turma)."""
    db.delete(turma)
    db.commit()
