from typing import Optional

from pydantic import BaseModel, Field


class SimuladoAnteriorOut(BaseModel):
    simulado_id: int
    titulo: str
    media_percentual: float


class ResumoSimuladoOut(BaseModel):
    """Média de acertos de um simulado e comparação com o simulado anterior."""
    simulado_id: int
    turma_id: Optional[int] = None
    corrigidos: int = Field(..., description="Alunos corrigidos considerados na média")
    media_percentual: Optional[float] = Field(
        None, description="Média dos percentuais de acerto dos alunos corrigidos (0-100); null sem correções"
    )
    anterior: Optional[SimuladoAnteriorOut] = Field(
        None, description="Simulado anterior (da mesma turma, se filtrado) com pelo menos uma correção"
    )
    variacao_pp: Optional[float] = Field(
        None, description="Diferença em pontos percentuais para o simulado anterior"
    )


class PontoHistoricoOut(BaseModel):
    mes: str = Field(..., description="Ano e mês no formato YYYY-MM")
    media_percentual: float = Field(..., description="Média dos percentuais dos alunos corrigidos no mês (0-100)")
    simulados: int = Field(..., description="Quantidade de simulados com correções aplicados no mês")
    corrigidos: int = Field(..., description="Total de provas corrigidas consideradas no mês")


class HistoricoOut(BaseModel):
    """Desempenho histórico mensal (média dos percentuais dos alunos corrigidos em cada mês)."""
    turma_id: Optional[int] = None
    pontos: list[PontoHistoricoOut] = []


class QuestaoErroItemOut(BaseModel):
    questao: int = Field(..., description="Número da questão")
    erros: int = Field(..., description="Quantidade de alunos corrigidos que erraram a questão")
    total: int = Field(..., description="Total de alunos corrigidos considerados")
    pct: int = Field(..., description="Percentual arredondado de erro (0-100)")


class QuestoesErroOut(BaseModel):
    """Questões de um simulado ordenadas do maior para o menor percentual de erro."""
    simulado_id: int
    turma_id: Optional[int] = None
    corrigidos: int
    questoes: list[QuestaoErroItemOut] = []



