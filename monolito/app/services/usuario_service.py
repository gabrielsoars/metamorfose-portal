from sqlalchemy.orm import Session

from ..models.usuario import Usuario
from ..repositories import usuario_repository
from ..schemas.usuario import UsuarioCreate, UsuarioUpdate

class EmailJaCadastrado(Exception):
    pass

class UsuarioNaoPodeSerAtivado(Exception):
    pass

def listar_usuarios(db: Session) -> list[Usuario]:
    return usuario_repository.listar_usuarios(db)

def obter_usuario(db: Session, usuario_id: int) -> Usuario | None:
    return usuario_repository.buscar_por_id(db, usuario_id)

def criar_usuario(db:Session, usuario_in: UsuarioCreate) -> Usuario | None:
    if usuario_repository.buscar_por_email(db, usuario_in.email) is not None:
        raise EmailJaCadastrado(usuario_in.email)
    return usuario_repository.criar_usuario(db, usuario_in)

def atualizar_usuario(db: Session, usuario_id: int, usuario_in: UsuarioUpdate) -> Usuario | None:
    usuario = usuario_repository.buscar_por_id(db, usuario_id)
    if usuario is None:
        return None
    dados_atualizacao = usuario_in.model_dump(exclude_unset=True)

    if dados_atualizacao.get("ativo") is True and usuario.senha_hash is None:
        raise UsuarioNaoPodeSerAtivado("Não é permitido ativar um usuário que ainda não concluiu o cadastro da senha por e-mail.")

    return usuario_repository.atualizar_usuario(db, usuario, dados_atualizacao)