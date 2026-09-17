from sqlalchemy.orm import Session

from ..models.turma import Turma


def listar_turmas(db: Session) -> list[Turma]:
    return db.query(Turma).order_by(Turma.nome).all()


def buscar_turma_por_id(db: Session, turma_id: int) -> Turma | None:
    return db.query(Turma).filter(Turma.id == turma_id).first()
