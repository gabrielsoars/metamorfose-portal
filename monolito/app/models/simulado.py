from sqlalchemy import Column, ForeignKey, Integer, String, Date, CHAR, Table, UniqueConstraint

from sqlalchemy.orm import relationship
from ..db.base import Base

simulado_turma = Table(
    "simulado_turma",
    Base.metadata,
    Column("simulado_id", Integer, ForeignKey("simulado.id"), primary_key=True),
    Column("turma_id", Integer, ForeignKey("turma.id"), primary_key=True),
)

class Simulado(Base):
    __tablename__ = "simulado"

    id = Column(Integer, primary_key=True)
    titulo = Column(String, nullable=False)
    data_aplicacao = Column(Date, nullable=False)
    total_questoes = Column(Integer, nullable=True)

    turmas = relationship("Turma", secondary=simulado_turma, backref="simulados")
    gabarito = relationship(
        "Gabarito",
        backref="simulado",
        cascade="all, delete-orphan",
        order_by="Gabarito.num_questao",
    )

class Gabarito(Base):
    __tablename__ = "gabarito"

    id = Column(Integer, primary_key=True)
    simulado_id = Column(Integer, ForeignKey("simulado.id", ondelete="CASCADE"), nullable=False)
    num_questao = Column(Integer, nullable=False)
    alt_correta = Column(CHAR(1), nullable=False)

    __table_args__ = (
        UniqueConstraint("simulado_id", "num_questao", name="uq_gabarito_simulado_numquestao"),
    )
