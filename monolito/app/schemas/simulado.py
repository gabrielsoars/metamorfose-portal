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
    alt_correta: Optional[str] = Field(
        None,
        min_length=1,
        max_length=1,
        description="Alternativa correta (A-E). Opcional apenas para questões anuladas.",
    )

    @field_validator("alt_correta")
    @classmethod
    def validar_alternativa(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v_upper = v.strip().upper()
        if v_upper not in {"A", "B", "C", "D", "E"}:
            raise ValueError(f"Alternativa '{v}' inválida. Deve ser A, B, C, D ou E.")
        return v_upper

class GabaritoCreate(GabaritoBase):
    anulada: Optional[bool] = Field(
        None,
        description="true anula a questão; false a reativa. Se omitido, mantém o estado atual "
                    "(questões novas nascem não anuladas).",
    )

class GabaritoOut(GabaritoBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    simulado_id: int
    anulada: bool = False

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

STATUS_CORRIGIDO = "CORRIGIDO"
STATUS_NAO_CORRIGIDO = "NÃO CORRIGIDO"

class AlunoSimuladoOut(BaseModel):
    """Item da listagem de alunos de um simulado com o status de correção."""
    id: int
    nome: str
    turma_id: int
    turma: str
    status: str
    nota: Optional[str] = None

class AlunosSimuladoOut(BaseModel):
    total: int
    alunos: list[AlunoSimuladoOut]

class AlunoResumoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    turma_id: int

class DetalhamentoQuestaoOut(BaseModel):
    questao: int
    resposta_aluno: Optional[str] = None
    resposta_correta: Optional[str] = None
    correto: bool
    anulada: bool = False

class CorrecaoAlunoOut(BaseModel):
    """Resultado da correção de um aluno em um simulado."""
    simulado_id: int
    aluno: AlunoResumoOut
    status: str
    acertos: Optional[int] = None
    total_questoes: int
    nota: Optional[str] = None
    detalhamento: list[DetalhamentoQuestaoOut] = []
    avisos: list[str] = []

class RespostaAlunoIn(BaseModel):
    questao: int = Field(..., ge=1, description="Número da questão")
    resposta_marcada: Optional[str] = Field(
        None, description="Alternativa marcada (A-E) ou null para questão em branco"
    )

    @field_validator("resposta_marcada")
    @classmethod
    def validar_alternativa(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v_upper = v.strip().upper()
        if v_upper == "":
            return None
        if v_upper not in {"A", "B", "C", "D", "E"}:
            raise ValueError(f"Alternativa '{v}' inválida. Deve ser A, B, C, D, E ou null.")
        return v_upper

class RespostasAlunoUpdate(BaseModel):
    respostas: list[RespostaAlunoIn]
