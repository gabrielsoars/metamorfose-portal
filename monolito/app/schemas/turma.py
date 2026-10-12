from typing import Optional
from pydantic import BaseModel, ConfigDict

class TurmaBase(BaseModel):
    nome: str
    ano: int
    turno: str

class TurmaOut(TurmaBase):
    model_config = ConfigDict(from_attributes=True)

    id: int

class TurmaCreate(TurmaBase):
    pass

class TurmaUpdate(BaseModel):
    nome: Optional[str] = None
    ano: Optional[int] = None
    turno: Optional[str] = None
