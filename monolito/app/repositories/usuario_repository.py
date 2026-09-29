from sqlalchemy.orm import Session

from ..models.usuario import Usuario
from ..schemas.usuario import UsuarioCreate

def listar_usuarios(db: Session) -> list[Usuario]:
    return db.query(Usuario).order_by(Usuario.nome).all()

def buscar_por_id(db: Session, usuario_id: int) -> Usuario | None:
    return db.query(Usuario).filter(Usuario.id == usuario_id).first()

def buscar_por_email(db:Session, email: str) -> Usuario | None:
    return db.query(Usuario).filter(Usuario.email == email).first()

def criar_usuario(db: Session, usuario_in: UsuarioCreate) -> Usuario:
    novo_usuario = Usuario(
        nome=usuario_in.nome,
        email=usuario_in.email,
        materia=usuario_in.materia,
        tipo=usuario_in.tipo,
        senha_hash=None
    )
    db.add(novo_usuario)
    db.commit()
    db.refresh(novo_usuario)
    return novo_usuario

def atualizar_usuario(db: Session, usuario: Usuario, dados_atualizacao: dict) -> Usuario:
    for campo, valor in dados_atualizacao.items():
        setattr(usuario, campo, valor)

    db.commit()
    db.refresh(usuario)
    return usuario