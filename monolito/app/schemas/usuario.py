from typing import Annotated, Optional
from pydantic import AfterValidator, BaseModel, ConfigDict, EmailStr, Field

from ..models.usuario import TipoUsuario

def _normalizar_email(email: str) -> str:
    return email.strip().lower()

# E-mail sem diferenciar maiúsculas: "Prof@Escola.com" e "prof@escola.com" são a mesma conta.
EmailNormalizado = Annotated[str, AfterValidator(_normalizar_email)]
EmailValidoNormalizado = Annotated[EmailStr, AfterValidator(_normalizar_email)]

class UsuarioBase(BaseModel):
    nome: str
    email: EmailValidoNormalizado
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
    email: EmailNormalizado
    codigo: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")
    # bcrypt considera só os primeiros 72 bytes
    senha: str = Field(min_length=8, max_length=72)

class ReenviarAtivacaoRequest(BaseModel):
    email: EmailNormalizado

class EsqueciSenhaRequest(BaseModel):
    email: EmailNormalizado

class RedefinirSenhaRequest(BaseModel):
    email: EmailNormalizado
    codigo: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")
    # bcrypt considera só os primeiros 72 bytes
    senha: str = Field(min_length=8, max_length=72)

class LoginRequest(BaseModel):
    email: EmailNormalizado
    senha: str

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int