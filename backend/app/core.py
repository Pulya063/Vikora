from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, model_validator, field_validator
from typing import Literal

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', extra='ignore', hide_input_in_errors=True)
    database_url: str = 'postgresql+asyncpg://vikora:vikora_local@127.0.0.1:55432/vikora'
    database_ssl_mode: Literal['disable', 'verify-full'] = 'disable'
    database_ssl_ca_file: str | None = None
    app_env: str = 'local'
    allowed_origins: list[str] = ['http://localhost:3000', 'http://127.0.0.1:3000']
    telegram_bot_token: str = ''
    telegram_manager_chat_id: str = ''
    telegram_admin_ids: list[int] = []
    telegram_webhook_secret: str = ''
    notion_token: str = ''
    notion_data_source_id: str = ''
    public_site_url: str = 'http://localhost:3000'
    allowed_hosts: list[str] = ['localhost', '127.0.0.1', 'app', 'test', 'testserver']
    max_in_flight: int = Field(default=32, ge=1, le=256)
    max_request_bytes: int = Field(default=32768, ge=1024, le=1048576)
    request_body_timeout: float = Field(default=10, gt=0, le=60)
    requests_per_minute: int = Field(default=120, ge=1, le=10000)

    @field_validator('database_url')
    @classmethod
    def async_postgres_url(cls, value):
        # Managed providers usually return postgres:// or postgresql:// URLs.
        for prefix in ('postgres://', 'postgresql://'):
            if value.startswith(prefix):
                return 'postgresql+asyncpg://' + value[len(prefix):]
        if not value.startswith('postgresql+asyncpg://'):
            raise ValueError('DATABASE_URL must be a PostgreSQL URL')
        return value

    @model_validator(mode='after')
    def production_transport(self):
        if self.app_env not in {'local', 'test', 'production'}:
            raise ValueError('APP_ENV must be local, test or production')
        if self.app_env == 'production':
            if not self.public_site_url.startswith('https://') or not self.allowed_origins or any(not origin.startswith('https://') for origin in self.allowed_origins):
                raise ValueError('Production requires explicit HTTPS site and origins')
            if '*' in self.allowed_hosts:
                raise ValueError('Production requires explicit allowed hosts')
        return self

@lru_cache
def settings():
    return Settings()
