from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..db.session import get_db
from ..schemas.usuario import UsuarioOut, UsuarioCreate, UsuarioUpdate
from ..services import usuario_service

router = APIRouter(prefix="/usuarios", tags=["usuarios"])

@router.get("", response_model=list[UsuarioOut])
def get_usuario(db: Session = Depends(get_db)):
    return usuario_service.listar_usuarios(db)

@router.get("/{usuario_id}", response_model=UsuarioOut)
def get_usuario_by_id(usuario_id: int, db: Session = Depends(get_db)):
    usuario = usuario_service.obter_usuario(db, usuario_id)
    if usuario is None:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    return usuario

@router.post("", response_model=UsuarioOut, status_code=status.HTTP_201_CREATED)
def post_usuario(usuario_in: UsuarioCreate, db:Session = Depends(get_db)):
    try:
        return usuario_service.criar_usuario(db, usuario_in)
    except usuario_service.EmailJaCadastrado:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe um usuário cadastrado com este e-mail."
        )

@router.patch("/{usuario_id}", response_model=UsuarioOut, status_code=status.HTTP_200_OK)
def patch_usuario(usuario_id: int, usuario_in: UsuarioUpdate, db: Session = Depends(get_db)):
    try:
        usuario = usuario_service.atualizar_usuario(db, usuario_id, usuario_in)
        if usuario is None:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")
        return usuario
    except usuario_service.UsuarioNaoPodeSerAtivado as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=str(err)
        )
