from sqlalchemy.orm import Session

from ..models.aluno import Aluno


def listar_por_turma(db: Session, turma_id: int) -> list[Aluno]:
    return (
        db.query(Aluno)
        .filter(Aluno.turma_id == turma_id)
        .order_by(Aluno.nome)
        .all()
    )


def buscar_por_id(db: Session, aluno_id: int) -> Aluno | None:
    return db.query(Aluno).filter(Aluno.id == aluno_id).first()
