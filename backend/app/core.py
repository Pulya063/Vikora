from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')
    database_url: str = 'postgresql+asyncpg://vikora:vikora_local@127.0.0.1:55432/vikora'
    app_env: str = 'local'
    allowed_origins: list[str] = ['http://localhost:3000', 'http://127.0.0.1:3000']
    telegram_bot_token: str = ''
    telegram_manager_chat_id: str = ''
    telegram_admin_ids: list[int] = []
    telegram_webhook_secret: str = ''
    notion_token: str = ''
    notion_data_source_id: str = ''
    public_site_url: str = 'http://localhost:3000'

@lru_cache
def settings():
    return Settings()
