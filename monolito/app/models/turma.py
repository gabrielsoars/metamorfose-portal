from sqlalchemy import Column, Integer, String

from ..db.base import Base


class Turma(Base):
    __tablename__ = "turma"

    id = Column(Integer, primary_key=True)
    nome = Column(String, nullable=False)
    ano = Column(Integer, nullable=False)
    turno = Column(String, nullable=False)
