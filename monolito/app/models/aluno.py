from sqlalchemy import Column, ForeignKey, Integer, String

from ..db.base import Base


class Aluno(Base):
    __tablename__ = "aluno"

    id = Column(Integer, primary_key=True)
    nome = Column(String, nullable=False)
    matricula = Column(String, nullable=True)
    email = Column(String, nullable=True)
    telefone = Column(String, nullable=True)
    turma_id = Column(Integer, ForeignKey("turma.id"), nullable=False)
