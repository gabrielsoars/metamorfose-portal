import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from ..core import security
from ..core.config import get_settings
from ..models.usuario import Usuario
from ..repositories import usuario_repository
from . import email_service

class CredenciaisInvalidas(Exception):
    pass

class UsuarioInativo(Exception):
    pass

class CodigoAtivacaoInvalido(Exception):
    pass

def _agora_utc() -> datetime:
    # A coluna token_expiracao é DateTime sem timezone; gravamos sempre em UTC.
    return datetime.now(timezone.utc).replace(tzinfo=None)

def gerar_codigo_ativacao(db: Session, usuario: Usuario) -> None:
    codigo = f"{secrets.randbelow(1_000_000):06d}"
    expiracao = _agora_utc() + timedelta(minutes=get_settings().codigo_ativacao_expire_minutes)
    # Apenas o hash do código fica no banco
    usuario_repository.atualizar_usuario(db, usuario, {
        "token_ativacao": security.gerar_hash(codigo),
        "token_expiracao": expiracao,
    })
    email_service.enviar_codigo_ativacao(usuario.email, codigo)

def reenviar_codigo_ativacao(db: Session, email: str) -> None:
    usuario = usuario_repository.buscar_por_email(db, email)
    # Silencioso para e-mails inexistentes ou já ativados, evitando enumeração de usuários
    if usuario is None or usuario.senha_hash is not None:
        return
    gerar_codigo_ativacao(db, usuario)

def ativar_conta(db: Session, email: str, codigo: str, senha: str) -> Usuario:
    usuario = usuario_repository.buscar_por_email(db, email)
    if (
        usuario is None
        or usuario.senha_hash is not None
        or usuario.token_expiracao is None
        or usuario.token_expiracao < _agora_utc()
        or not security.verificar_hash(codigo, usuario.token_ativacao)
    ):
        raise CodigoAtivacaoInvalido("Código de ativação inválido ou expirado.")

    return usuario_repository.atualizar_usuario(db, usuario, {
        "senha_hash": security.gerar_hash(senha),
        "ativo": True,
        "token_ativacao": None,
        "token_expiracao": None,
    })

def autenticar(db: Session, email: str, senha: str) -> str:
    usuario = usuario_repository.buscar_por_email(db, email)
    senha_hash = usuario.senha_hash if usuario is not None else None
    if not security.verificar_hash(senha, senha_hash):
        raise CredenciaisInvalidas()
    if not usuario.ativo:
        raise UsuarioInativo()
    return security.criar_access_token(usuario.id)
