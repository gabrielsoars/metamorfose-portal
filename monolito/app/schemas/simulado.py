from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from .turma import TurmaOut

class SimuladoBase(BaseModel):
    titulo: str
    data_aplicacao: date
    total_questoes: int

class SimuladoCreate(SimuladoBase):
    turmas_ids: list[int] = []

class GabaritoBase(BaseModel):
    num_questao: int = Field(..., ge=1, description="Número da questão")
    alt_correta: str = Field(..., min_length=1, max_length=1, description="Alternativa correta (A-E)")

    @field_validator("alt_correta")
    @classmethod
    def validar_alternativa(cls, v: str) -> str:
        v_upper = v.strip().upper()
        if v_upper not in {"A", "B", "C", "D", "E"}:
            raise ValueError(f"Alternativa '{v}' inválida. Deve ser A, B, C, D ou E.")
        return v_upper

class GabaritoCreate(GabaritoBase):
    pass

class GabaritoOut(GabaritoBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    simulado_id: int

class SimuladoOut(SimuladoBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    turmas: list[TurmaOut] = []
    gabarito: list[GabaritoOut] = []

class SimuladoUpdate(BaseModel):
    titulo: Optional[str] = None
    data_aplicacao: Optional[date] = None
    total_questoes: Optional[int] = None
    turmas_ids: Optional[list[int]] = None
