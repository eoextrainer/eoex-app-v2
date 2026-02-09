from functools import lru_cache
from typing import List, Optional

from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://eoe_app:secure_password_123@localhost:5433/eoex"
    database_pool_size: int = 10
    database_max_overflow: int = 10
    db_password: Optional[str] = None

    secret_key: str = "change_me_please"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    cors_origins: List[str] = ["http://localhost:3000", "http://localhost:8000"]

    class Config:
        env_file = str(Path(__file__).resolve().parents[2] / ".env")


@lru_cache()
def get_settings() -> Settings:
    return Settings()
