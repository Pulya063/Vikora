import re
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, EmailStr, field_validator, model_validator

class Strict(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)

class Dimensions(Strict):
    width_mm: int = Field(ge=400, le=3000)
    height_mm: int = Field(ge=400, le=2400)

class Services(Strict):
    delivery: bool = False
    installation: bool = False

class Configuration(Strict):
    product_type: Literal['window'] = 'window'
    profile: str = Field(max_length=80)
    dimensions: Dimensions
    construction: Literal['fixed','single','double','triple'] = 'double'
    sections: int = Field(ge=1, le=3)
    opening: list[Literal['fixed','turn','tilt_turn']] = Field(min_length=1, max_length=3)
    glass_unit: Literal['standard','energy_saving','solar_control']
    color: Literal['white'] = 'white'
    extras: list[str] = Field(default_factory=list, max_length=6)
    services_requested: Services = Field(default_factory=Services)

    @model_validator(mode='after')
    def consistent(self):
        expected = {'fixed':1,'single':1,'double':2,'triple':3}[self.construction]
        if self.sections != expected or len(self.opening) != expected:
            raise ValueError('Кількість секцій не відповідає конструкції')
        if self.construction == 'fixed' and self.opening != ['fixed']:
            raise ValueError('Глухе вікно не відкривається')
        if len(set(self.extras)) != len(self.extras):
            raise ValueError('Опції не можуть повторюватися')
        sash_width = self.dimensions.width_mm / self.sections
        if not 400 <= sash_width <= 1500:
            raise ValueError('Ширина однієї секції має бути від 400 до 1500 мм')
        if any(x != 'fixed' for x in self.opening) and sash_width * self.dimensions.height_mm > 2250000:
            raise ValueError('Для такої площі відкривної стулки потрібен розрахунок менеджера')
        return self

class QuoteRequest(Strict):
    name: str = Field(min_length=2, max_length=100)
    phone: str
    email: EmailStr | None = None
    city: str = Field(default='', max_length=120)
    preferred_contact: Literal['phone','Telegram','Viber','WhatsApp','email'] = 'phone'
    contact_handle: str = Field(default='', max_length=100)
    comment: str = Field(default='', max_length=2000)
    configuration: Configuration | None = None
    pricing_version: str | None = None
    needs_delivery: bool = False
    needs_installation: bool = False
    consent: Literal[True]
    website: str = Field(default='', max_length=0)

    @field_validator('phone')
    @classmethod
    def normalize_phone(cls, v):
        v = re.sub(r'[\s()\-]', '', v)
        if re.fullmatch(r'0\d{9}', v):
            v = '+38' + v
        if not re.fullmatch(r'\+380\d{9}', v):
            raise ValueError('Вкажіть український номер +380XXXXXXXXX')
        return v

    @model_validator(mode='after')
    def contact_available(self):
        if self.preferred_contact == 'email' and not self.email:
            raise ValueError('Для зв’язку електронною поштою вкажіть email')
        if self.preferred_contact == 'Telegram' and not self.contact_handle:
            raise ValueError('Для Telegram вкажіть ім’я користувача')
        return self
