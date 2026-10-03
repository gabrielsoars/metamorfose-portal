from sqlalchemy.orm import Session

from ..models.turma import Turma
from ..schemas.turma import TurmaCreate, TurmaUpdate

def listar_turmas(db: Session) -> list[Turma]:
    return db.query(Turma).order_by(Turma.nome).all()


def buscar_turma_por_id(db: Session, turma_id: int) -> Turma | None:
    return db.query(Turma).filter(Turma.id == turma_id).first()

def criar_turma(db: Session, turma_in: TurmaCreate) -> Turma | None:
    nova_turma = Turma(
        nome=turma_in.nome,
        ano=turma_in.ano,
        turno=turma_in.turno
    )
    db.add(nova_turma)
    db.commit()
    db.refresh(nova_turma)
    return nova_turma

def atualizar_turma(db: Session, turma: Turma, dados_atualizacao: dict):
    for campo, valor in dados_atualizacao.items():
        setattr(turma, campo, valor)
    
    print("passou 2")
    db.commit()
    db.refresh(turma)
    return turma
