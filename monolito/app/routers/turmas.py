from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..db.session import get_db
from ..schemas.turma import TurmaOut, TurmaCreate, TurmaUpdate
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

@router.post("/", response_model=TurmaOut, status_code=status.HTTP_201_CREATED)
def post_turma(turma_in: TurmaCreate, db:Session = Depends(get_db)):
    return turma_service.criar_turma(db, turma_in)

@router.patch("/{turma_id}", response_model=TurmaOut, status_code=status.HTTP_200_OK)
def patch_turma(turma_id: int, turma_in: TurmaUpdate, db: Session = Depends(get_db)):
    return turma_service.atualizar_turma(db, turma_id, turma_in)