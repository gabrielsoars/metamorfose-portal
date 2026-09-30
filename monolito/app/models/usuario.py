import enum
from sqlalchemy import Column, Integer, String, Boolean, DateTime, UniqueConstraint
from sqlalchemy.types import TypeDecorator

from ..db.base import Base

class TipoUsuario(enum.IntEnum):
    ADMIN = 0
    PROFESSOR = 1

class TipoUsuarioType(TypeDecorator):
    impl = Integer
    cache_ok = True
    # converte Enum -> int
    def process_bind_param(self, value, dialect):
        if value is not None:
            return int(value)
        return value
    # converte int -> Enum
    def process_result_value(self, value, dialect):
        if value is not None:
            return TipoUsuario(value)
        return value

class Usuario(Base):
    __tablename__ = "usuario"

    id = Column(Integer, primary_key=True)
    nome = Column(String, nullable=False)
    email = Column(String, nullable=False)
    senha_hash = Column(String, nullable=True)
    materia = Column(String, nullable=True)
    tipo = Column(TipoUsuarioType, nullable=False)
    ativo = Column(Boolean, default=False)
    token_ativacao = Column(String, nullable=True)
    token_expiracao = Column(DateTime, nullable=True)

    __table_args__ = (
        UniqueConstraint("email", name="uq_usuario_email"),
    )
