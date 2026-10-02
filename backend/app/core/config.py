from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT / "backend/.env", extra="ignore")
    database_url: str
    test_database_url: str = ""
    api_port: int = 8000
    render_base_url: str = "http://127.0.0.1:8000/_render"
    storage_root: Path = ROOT / "storage/files"
    render_timeout_seconds: int = 180
    result_ttl_hours: int = 24


settings = Settings()
settings.storage_root.mkdir(parents=True, exist_ok=True)
