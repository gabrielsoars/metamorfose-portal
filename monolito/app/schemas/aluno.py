from typing import Optional

from pydantic import BaseModel, ConfigDict
    
class AlunoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    turma_id: int

class AlunoCreate(BaseModel):
    nome: str

class AlunoUpdate(BaseModel):
    nome: Optional[str] = None
    turma_id: Optional[int] = None
