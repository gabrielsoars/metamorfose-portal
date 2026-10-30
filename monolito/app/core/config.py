from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # development | homologacao | producao
    app_env: str = "development"

    db_host: str = "localhost"
    db_port: int = 5432
    db_user: str = "postgres"
    db_password: str = ""
    db_name: str = "postgres"
    database_url: str | None = Field(default=None, alias="DATABASE_URL")

    # JWT emitido para o scan-service. Apenas algoritmos assimétricos: o monólito
    # assina com a chave privada e o scan-service valida com a chave pública.
    # issuer/audience/algoritmo precisam ser iguais aos configurados no scan-service.
    jwt_private_key_path: str | None = None
    jwt_algorithm: Literal["RS256", "RS384", "RS512"] = "RS256"
    jwt_issuer: str = "metamorfose-monolito"
    jwt_audience: str = "metamorfose-scan-service"
    jwt_expire_minutes: int = 60

    # Primeiro acesso: código de ativação enviado por e-mail
    codigo_ativacao_expire_minutes: int = 60 * 24
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_use_tls: bool = True
    smtp_from: str = "nao-responda@metamorfose.local"

    # Admin inicial: criado na subida se ainda não existir nenhum admin.
    # Ele define a senha pelo fluxo de primeiro acesso (código por e-mail).
    admin_email: str | None = None
    admin_nome: str = "Administrador"

    @property
    def effective_database_url(self) -> str:
        if self.database_url:
            return self.database_url

        if self.db_host in {"", "localhost", "127.0.0.1"} and not self.db_password:
            return "sqlite:///./metamorfose.db"

        return (
            f"postgresql+psycopg2://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
