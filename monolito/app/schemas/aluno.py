from typing import Optional

from pydantic import BaseModel, ConfigDict


class AlunoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    matricula: Optional[str]
    email: Optional[str]
    telefone: Optional[str]
    turma_id: int
