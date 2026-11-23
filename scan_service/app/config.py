from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # development | homologacao | producao
    app_env: str = "development"

    # Validação local do JWT emitido pelo monólito. Só a chave pública fica aqui,
    # então este serviço consegue validar tokens, mas não emiti-los.
    # issuer/audience/algoritmo precisam ser iguais aos configurados no monólito.
    jwt_public_key_path: str | None = None
    jwt_algorithm: Literal["RS256", "RS384", "RS512"] = "RS256"
    jwt_issuer: str = "metamorfose-monolito"
    jwt_audience: str = "metamorfose-scan-service"
    jwt_leeway_seconds: int = 0

    # Origens liberadas para o navegador, separadas por vírgula ("*" libera todas).
    # Em produção: CORS_ORIGINS=https://app.exemplo.com.br
    cors_origins: str = "*"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origem.strip() for origem in self.cors_origins.split(",") if origem.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
