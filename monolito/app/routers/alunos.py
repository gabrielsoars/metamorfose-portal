from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db.session import get_db
from ..schemas.aluno import AlunoOut, AlunoCreate, AlunoUpdate
from ..services import aluno_service

router = APIRouter(tags=["alunos"])


@router.get("/turmas/{turma_id}/alunos", response_model=list[AlunoOut])
def listar_alunos_da_turma(turma_id: int, db: Session = Depends(get_db)):
    try:
        return aluno_service.listar_alunos_da_turma(db, turma_id)
    except aluno_service.TurmaNaoEncontrada:
        raise HTTPException(status_code=404, detail="Turma não encontrada.")


@router.get("/alunos/{aluno_id}", response_model=AlunoOut)
def obter_aluno(aluno_id: int, db: Session = Depends(get_db)):
    aluno = aluno_service.obter_aluno(db, aluno_id)
    if aluno is None:
        raise HTTPException(status_code=404, detail="Aluno não encontrado.")
    return aluno

@router.post("/turmas/{turma_id}/alunos", response_model=AlunoOut)
def post_aluno(turma_id: int, aluno_in: AlunoCreate, db: Session = Depends(get_db)):
    try:
        return aluno_service.criar_aluno(db, turma_id, aluno_in)
    except aluno_service.TurmaNaoEncontrada:
        raise HTTPException(status_code=404, detail="Turma não encontrada.")

@router.patch("/alunos/{aluno_id}", response_model=AlunoOut)
def patch_aluno(aluno_id: int, aluno_in: AlunoUpdate, db: Session = Depends(get_db)):
    try:
        return aluno_service.atualizar_aluno(db, aluno_id, aluno_in)
    except aluno_service.TurmaNaoEncontrada:
        raise HTTPException(status_code=404, detail="Turma não encontrada.")
    except aluno_service.AlunoNaoEncontrado:
        raise HTTPException(status_code=404, detail="Aluno não encontrado.")
