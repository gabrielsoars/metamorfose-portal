from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..db.session import get_db

from ..schemas.simulado import (
    SimuladoOut,
    SimuladoCreate,
    SimuladoUpdate,
    GabaritoOut,
    GabaritoCreate,
    AlunosSimuladoOut,
    CorrecaoAlunoOut,
    RespostasAlunoUpdate,
)
from ..services import simulado_service

router = APIRouter(prefix="/simulados", tags=["simulados"])

@router.post("", response_model=SimuladoOut, status_code=status.HTTP_201_CREATED)
def post_simulado(simulado_in: SimuladoCreate, db: Session = Depends(get_db)):
    try:
        return simulado_service.criar_simulado(db, simulado_in)
    except simulado_service.TurmaNaoEncontrada as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Turma(s) não encontrada(s): {exc.args[0]}"
        )

@router.get("", response_model=list[SimuladoOut])
def get_simulados(db: Session = Depends(get_db)):
    return simulado_service.listar_simulados(db)

@router.get("/{simulado_id}", response_model=SimuladoOut)
def get_simulado_by_id(simulado_id: int, db: Session = Depends(get_db)):
    try:
        return simulado_service.obter_simulado(db, simulado_id)
    except simulado_service.SimuladoNaoEncontrado:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Simulado não encontrado")

@router.patch("/{simulado_id}", response_model=SimuladoOut)
def patch_simulado(simulado_id: int, simulado_in: SimuladoUpdate, db: Session = Depends(get_db)):
    try:
        return simulado_service.atualizar_simulado(db, simulado_id, simulado_in)
    except simulado_service.SimuladoNaoEncontrado:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Simulado não encontrado")
    except simulado_service.TurmaNaoEncontrada as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Turma(s) não encontrada(s): {exc.args[0]}"
        )

@router.get("/{simulado_id}/gabarito", response_model=list[GabaritoOut])
def get_gabarito(simulado_id: int, db: Session = Depends(get_db)):
    try:
        return simulado_service.obter_gabarito(db, simulado_id)
    except simulado_service.SimuladoNaoEncontrado:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Simulado não encontrado")

@router.put("/{simulado_id}/gabarito", response_model=list[GabaritoOut])
def put_gabarito(
    simulado_id: int,
    gabarito_in: list[GabaritoCreate] | GabaritoCreate,
    db: Session = Depends(get_db)
):
    try:
        return simulado_service.salvar_gabarito(db, simulado_id, gabarito_in)
    except simulado_service.SimuladoNaoEncontrado:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Simulado não encontrado")
    except simulado_service.GabaritoInvalido as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("/{simulado_id}/alunos", response_model=AlunosSimuladoOut)
def get_alunos_simulado(simulado_id: int, db: Session = Depends(get_db)):
    try:
        return simulado_service.listar_alunos_do_simulado(db, simulado_id)
    except simulado_service.SimuladoNaoEncontrado:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Simulado não encontrado")

@router.get("/{simulado_id}/alunos/{aluno_id}", response_model=CorrecaoAlunoOut)
def get_correcao_aluno(simulado_id: int, aluno_id: int, db: Session = Depends(get_db)):
    try:
        return simulado_service.obter_correcao_aluno(db, simulado_id, aluno_id)
    except simulado_service.SimuladoNaoEncontrado:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Simulado não encontrado")
    except simulado_service.AlunoNaoEncontradoNoSimulado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aluno não encontrado nas turmas deste simulado"
        )

@router.put("/{simulado_id}/alunos/{aluno_id}", response_model=CorrecaoAlunoOut)
def put_respostas_aluno(
    simulado_id: int,
    aluno_id: int,
    respostas_in: RespostasAlunoUpdate,
    db: Session = Depends(get_db)
):
    try:
        return simulado_service.salvar_respostas_aluno(db, simulado_id, aluno_id, respostas_in)
    except simulado_service.SimuladoNaoEncontrado:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Simulado não encontrado")
    except simulado_service.AlunoNaoEncontradoNoSimulado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aluno não encontrado nas turmas deste simulado"
        )
    except simulado_service.RespostasInvalidas as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
