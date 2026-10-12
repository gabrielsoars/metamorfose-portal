from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    db_host: str = "localhost"
    db_port: int = 5432
    db_user: str = "postgres"
    db_password: str = ""
    db_name: str = "postgres"
    database_url: str | None = Field(default=None, alias="DATABASE_URL")

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
