from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field

from ..models.usuario import TipoUsuario

class UsuarioBase(BaseModel):
    nome: str
    email: EmailStr
    materia: Optional[str] = None
    tipo: TipoUsuario

class UsuarioCreate(UsuarioBase):
    pass

class UsuarioOut(UsuarioBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ativo: bool

class UsuarioUpdate(BaseModel):
    nome: Optional[str] = None
    materia: Optional[str] = None
    tipo: Optional[TipoUsuario] = None
    ativo: Optional[bool] = None

class AtivarContaRequest(BaseModel):
    email: str
    codigo: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")
    senha: str = Field(min_length=8)

class ReenviarAtivacaoRequest(BaseModel):
    email: str

class LoginRequest(BaseModel):
    email: str
    senha: str