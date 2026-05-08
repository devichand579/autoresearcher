from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # AI Provider - 'anthropic' or 'openai'
    ai_provider: str = "anthropic"
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    ai_model: str = "claude-sonnet-4-6"

    # Firecrawl
    firecrawl_api_key: str = ""

    # Database
    database_url: str = "sqlite:///./autoresearcher.db"
    chroma_persist_directory: str = "./chroma_db"

    # App
    app_name: str = "AutoResearcher"
    debug: bool = False
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:3001"]

    # Scheduler
    enable_scheduler: bool = True
    daily_fetch_hour: int = 8  # 8 AM UTC


@lru_cache
def get_settings() -> Settings:
    return Settings()
