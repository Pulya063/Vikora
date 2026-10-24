"""Validate the Telegram event subset used by our existing bot.

Telegram may add fields: ignore those while strictly checking the fields we consume.
"""
from typing import Annotated
from pydantic import BaseModel, ConfigDict, Field

TelegramID = Annotated[int, Field(strict=True, ge=1, le=2**63-1)]


class TelegramModel(BaseModel):
    model_config = ConfigDict(extra='ignore', strict=True)


class TelegramUser(TelegramModel):
    id: TelegramID


class TelegramChat(TelegramModel):
    id: int = Field(ge=-(2**63), le=2**63-1)
    type: str = Field(max_length=32)


class TelegramMessage(TelegramModel):
    sender: TelegramUser | None = Field(default=None, alias='from')
    chat: TelegramChat
    text: str | None = Field(default=None, max_length=4096)


class TelegramCallback(TelegramModel):
    id: str = Field(min_length=1, max_length=256)
    sender: TelegramUser = Field(alias='from')
    message: TelegramMessage | None = None
    data: str | None = Field(default=None, max_length=64)


class TelegramUpdate(TelegramModel):
    update_id: int = Field(ge=0, le=2**63-1)
    message: TelegramMessage | None = None
    callback_query: TelegramCallback | None = None
