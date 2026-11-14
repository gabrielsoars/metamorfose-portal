from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..db.session import get_db
from ..schemas.estatistica import HistoricoOut, QuestoesErroOut, ResumoSimuladoOut
from ..services import estatistica_service
from ..services.simulado_service import SimuladoNaoEncontrado

router = APIRouter(tags=["estatisticas"])


@router.get("/simulados/{simulado_id}/resumo", response_model=ResumoSimuladoOut)
def get_resumo_simulado(simulado_id: int, turma_id: int | None = None, db: Session = Depends(get_db)):
    try:
        return estatistica_service.resumo_simulado(db, simulado_id, turma_id)
    except SimuladoNaoEncontrado:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Simulado não encontrado")
    except estatistica_service.TurmaNaoVinculada:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Turma não vinculada a este simulado")


@router.get("/simulados/{simulado_id}/questoes-erro", response_model=QuestoesErroOut)
def get_questoes_erro_simulado(
    simulado_id: int,
    turma_id: int | None = None,
    limite: int | None = Query(None, ge=1, description="Limite opcional de questões retornadas"),
    db: Session = Depends(get_db),
):
    try:
        return estatistica_service.questoes_erro_simulado(db, simulado_id, turma_id, limite)
    except SimuladoNaoEncontrado:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Simulado não encontrado")
    except estatistica_service.TurmaNaoVinculada:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Turma não vinculada a este simulado")



@router.get("/estatisticas/historico", response_model=HistoricoOut)
def get_historico_mensal(
    turma_id: int | None = None,
    meses: int = Query(6, ge=1, le=24, description="Quantidade máxima de meses retornados"),
    db: Session = Depends(get_db),
):
    return estatistica_service.historico_mensal(db, turma_id, meses)


