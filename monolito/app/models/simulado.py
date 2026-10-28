from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Date, CHAR, Table, UniqueConstraint, false

from sqlalchemy.orm import backref, relationship
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
    # Pode ser nulo apenas quando a questão está anulada sem alternativa definida.
    alt_correta = Column(CHAR(1), nullable=True)
    # Questão anulada conta como acerto para todos os alunos corrigidos.
    anulada = Column(Boolean, nullable=False, default=False, server_default=false())

    __table_args__ = (
        UniqueConstraint("simulado_id", "num_questao", name="uq_gabarito_simulado_numquestao"),
    )

class RespostaAluno(Base):
    """Alternativa marcada por um aluno em uma questão (item do gabarito) de um simulado.

    O acerto não é persistido: ele é derivado do gabarito atual, de forma que
    editar o gabarito recalcula automaticamente as notas já corrigidas.
    `resposta_marcada` nulo representa questão em branco (contabilizada como erro).
    """
    __tablename__ = "resposta_aluno"

    aluno_id = Column(Integer, ForeignKey("aluno.id", ondelete="CASCADE"), primary_key=True)
    questao_id = Column(Integer, ForeignKey("gabarito.id", ondelete="CASCADE"), primary_key=True)
    resposta_marcada = Column(CHAR(1), nullable=True)

    questao = relationship(
        "Gabarito",
        backref=backref("respostas", cascade="all, delete-orphan", passive_deletes=True),
    )
