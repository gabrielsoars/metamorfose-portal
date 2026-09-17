from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db.session import get_db
from ..schemas.turma import TurmaOut
from ..services import turma_service

router = APIRouter(prefix="/turmas", tags=["turmas"])


@router.get("", response_model=list[TurmaOut])
def listar_turmas(db: Session = Depends(get_db)):
    return turma_service.listar_turmas(db)


@router.get("/{turma_id}", response_model=TurmaOut)
def obter_turma(turma_id: int, db: Session = Depends(get_db)):
    turma = turma_service.obter_turma(db, turma_id)
    if turma is None:
        raise HTTPException(status_code=404, detail="Turma não encontrada.")
    return turma
