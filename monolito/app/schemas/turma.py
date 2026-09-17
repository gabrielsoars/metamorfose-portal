from pydantic import BaseModel, ConfigDict


class TurmaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    ano: int
    turno: str
