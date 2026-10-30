from sqlalchemy.orm import Session

from ..models.aluno import Aluno
from ..models.simulado import RespostaAluno
from ..schemas.aluno import AlunoCreate, AlunoUpdate


def listar_por_turma(db: Session, turma_id: int) -> list[Aluno]:
    return (
        db.query(Aluno)
        .filter(Aluno.turma_id == turma_id)
        .order_by(Aluno.nome)
        .all()
    )


def buscar_por_id(db: Session, aluno_id: int) -> Aluno | None:
    return db.query(Aluno).filter(Aluno.id == aluno_id).first()


def criar_aluno(db: Session, turma_id: int, aluno_in: AlunoCreate) -> Aluno:
    novo_aluno = Aluno(
        nome = aluno_in.nome,
        turma_id = turma_id
    )

    db.add(novo_aluno)
    db.commit()
    db.refresh(novo_aluno)
    return novo_aluno

def excluir_aluno(db: Session, aluno: Aluno) -> None:
    """Apaga as respostas do aluno e o próprio aluno (sem depender de FK em cascata do banco)."""
    db.query(RespostaAluno).filter(RespostaAluno.aluno_id == aluno.id).delete(synchronize_session=False)
    db.delete(aluno)
    db.commit()


def excluir_por_turma(db: Session, turma_id: int) -> None:
    """Apaga, sem commitar, todos os alunos da turma e as respostas deles."""
    ids_alunos = db.query(Aluno.id).filter(Aluno.turma_id == turma_id)
    db.query(RespostaAluno).filter(RespostaAluno.aluno_id.in_(ids_alunos)).delete(synchronize_session=False)
    db.query(Aluno).filter(Aluno.turma_id == turma_id).delete(synchronize_session=False)


def atualizar_aluno(db: Session, aluno: Aluno, dados_atualizacao: dict) -> Aluno:
    for campo, valor in dados_atualizacao.items():
        setattr(aluno, campo, valor)

    db.commit()
    db.refresh(aluno)
    return aluno
