from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from ..core.config import get_settings
from ..core.dependencias import obter_usuario_atual
from ..db.session import get_db
from ..models.usuario import Usuario
from ..schemas.usuario import (
    AtivarContaRequest,
    EsqueciSenhaRequest,
    LoginRequest,
    RedefinirSenhaRequest,
    ReenviarAtivacaoRequest,
    TokenOut,
    UsuarioOut,
)
from ..services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=TokenOut)
def login(login_in: LoginRequest, db: Session = Depends(get_db)):
    try:
        token = auth_service.autenticar(db, login_in.email, login_in.senha)
    except auth_service.MuitasTentativas:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Muitas tentativas de login. Tente novamente em alguns minutos.",
        )
    except auth_service.CredenciaisInvalidas:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha inválidos.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except auth_service.UsuarioInativo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário desativado.",
        )
    return TokenOut(access_token=token, expires_in=get_settings().jwt_expire_minutes * 60)

@router.get("/me", response_model=UsuarioOut)
def usuario_logado(usuario: Usuario = Depends(obter_usuario_atual)):
    return usuario

@router.post("/ativar", status_code=status.HTTP_204_NO_CONTENT)
def ativar_conta(ativar_in: AtivarContaRequest, db: Session = Depends(get_db)):
    try:
        auth_service.ativar_conta(db, ativar_in.email, ativar_in.codigo, ativar_in.senha)
    except auth_service.CodigoAtivacaoInvalido as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.post("/reenviar-ativacao", status_code=status.HTTP_202_ACCEPTED)
def reenviar_ativacao(reenviar_in: ReenviarAtivacaoRequest, db: Session = Depends(get_db)):
    auth_service.reenviar_codigo_ativacao(db, reenviar_in.email)
    return {"detail": "Se o e-mail estiver pendente de ativação, um novo código foi enviado."}

@router.post("/esqueci-senha", status_code=status.HTTP_202_ACCEPTED)
def esqueci_senha(esqueci_in: EsqueciSenhaRequest, db: Session = Depends(get_db)):
    auth_service.solicitar_redefinicao_senha(db, esqueci_in.email)
    return {"detail": "Se o e-mail estiver cadastrado, um código de redefinição foi enviado."}

@router.post("/redefinir-senha", status_code=status.HTTP_204_NO_CONTENT)
def redefinir_senha(redefinir_in: RedefinirSenhaRequest, db: Session = Depends(get_db)):
    try:
        auth_service.redefinir_senha(db, redefinir_in.email, redefinir_in.codigo, redefinir_in.senha)
    except auth_service.CodigoRedefinicaoInvalido as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
