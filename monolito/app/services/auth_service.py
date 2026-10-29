import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from ..core import security
from ..core.config import get_settings
from ..core.limitador import LimiteTentativas
from ..models.usuario import Usuario
from ..repositories import usuario_repository
from . import email_service

class CredenciaisInvalidas(Exception):
    pass

class UsuarioInativo(Exception):
    pass

class MuitasTentativas(Exception):
    pass

class CodigoAtivacaoInvalido(Exception):
    pass

class CodigoRedefinicaoInvalido(Exception):
    pass

# Login: após 5 senhas erradas em 15 min, o e-mail fica bloqueado até a janela passar
_tentativas_login = LimiteTentativas(maximo=5, janela_segundos=15 * 60)
# Código por e-mail: após 5 erros o código é invalidado e é preciso pedir outro
_tentativas_codigo = LimiteTentativas(maximo=5, janela_segundos=24 * 60 * 60)
# Reenvio de código: no máximo um por minuto para cada e-mail
_envios_codigo = LimiteTentativas(maximo=1, janela_segundos=60)

def _agora_utc() -> datetime:
    # A coluna token_expiracao é DateTime sem timezone; gravamos sempre em UTC.
    return datetime.now(timezone.utc).replace(tzinfo=None)

def _chave(email: str) -> str:
    return email.strip().lower()

def _salvar_novo_codigo(db: Session, usuario: Usuario) -> str:
    codigo = f"{secrets.randbelow(1_000_000):06d}"
    expiracao = _agora_utc() + timedelta(minutes=get_settings().codigo_ativacao_expire_minutes)
    # Apenas o hash do código fica no banco
    usuario_repository.atualizar_usuario(db, usuario, {
        "token_ativacao": security.gerar_hash(codigo),
        "token_expiracao": expiracao,
    })
    _tentativas_codigo.limpar(_chave(usuario.email))
    return codigo

def _codigo_confere(db: Session, usuario: Usuario, codigo: str) -> bool:
    if usuario.token_expiracao is None or usuario.token_expiracao < _agora_utc():
        return False
    if security.verificar_hash(codigo, usuario.token_ativacao):
        return True

    chave = _chave(usuario.email)
    _tentativas_codigo.registrar(chave)
    if _tentativas_codigo.bloqueado(chave):
        # Impede chutar os 6 dígitos: o código atual deixa de valer
        usuario_repository.atualizar_usuario(db, usuario, {"token_ativacao": None, "token_expiracao": None})
        _tentativas_codigo.limpar(chave)
    return False

def _pode_enviar_codigo(email: str) -> bool:
    chave = _chave(email)
    if _envios_codigo.bloqueado(chave):
        return False
    _envios_codigo.registrar(chave)
    return True

def gerar_codigo_ativacao(db: Session, usuario: Usuario) -> None:
    codigo = _salvar_novo_codigo(db, usuario)
    email_service.enviar_codigo_ativacao(usuario.email, codigo)

def reenviar_codigo_ativacao(db: Session, email: str) -> None:
    if not _pode_enviar_codigo(email):
        return
    usuario = usuario_repository.buscar_por_email(db, email)
    # Silencioso para e-mails inexistentes ou já ativados, evitando enumeração de usuários
    if usuario is None or usuario.senha_hash is not None:
        return
    gerar_codigo_ativacao(db, usuario)

def ativar_conta(db: Session, email: str, codigo: str, senha: str) -> Usuario:
    usuario = usuario_repository.buscar_por_email(db, email)
    if usuario is None or usuario.senha_hash is not None or not _codigo_confere(db, usuario, codigo):
        raise CodigoAtivacaoInvalido("Código de ativação inválido ou expirado.")

    return usuario_repository.atualizar_usuario(db, usuario, {
        "senha_hash": security.gerar_hash(senha),
        "ativo": True,
        "token_ativacao": None,
        "token_expiracao": None,
    })

def solicitar_redefinicao_senha(db: Session, email: str) -> None:
    if not _pode_enviar_codigo(email):
        return
    usuario = usuario_repository.buscar_por_email(db, email)
    # Só para contas já ativadas; o resto é silencioso, evitando enumeração de usuários
    if usuario is None or usuario.senha_hash is None or not usuario.ativo:
        return
    codigo = _salvar_novo_codigo(db, usuario)
    email_service.enviar_codigo_redefinicao(usuario.email, codigo)

def redefinir_senha(db: Session, email: str, codigo: str, senha: str) -> Usuario:
    usuario = usuario_repository.buscar_por_email(db, email)
    if usuario is None or usuario.senha_hash is None or not _codigo_confere(db, usuario, codigo):
        raise CodigoRedefinicaoInvalido("Código de redefinição inválido ou expirado.")

    _tentativas_login.limpar(_chave(email))
    return usuario_repository.atualizar_usuario(db, usuario, {
        "senha_hash": security.gerar_hash(senha),
        "token_ativacao": None,
        "token_expiracao": None,
    })

def autenticar(db: Session, email: str, senha: str) -> str:
    chave = _chave(email)
    if _tentativas_login.bloqueado(chave):
        raise MuitasTentativas()

    usuario = usuario_repository.buscar_por_email(db, email)
    senha_hash = usuario.senha_hash if usuario is not None else None
    if not security.verificar_hash(senha, senha_hash):
        _tentativas_login.registrar(chave)
        raise CredenciaisInvalidas()
    if not usuario.ativo:
        raise UsuarioInativo()

    _tentativas_login.limpar(chave)
    return security.criar_access_token(usuario.id)

def resetar_limites() -> None:
    """Zera os contadores de tentativas (usado nos testes)."""
    _tentativas_login.resetar()
    _tentativas_codigo.resetar()
    _envios_codigo.resetar()
