from datetime import datetime
from decimal import Decimal
from sqlalchemy import String, Text, Numeric, Boolean, DateTime, ForeignKey, UniqueConstraint, func, BigInteger
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.db import Base

class Lead(Base):
    __tablename__ = 'leads'
    id: Mapped[int] = mapped_column(primary_key=True)
    public_id: Mapped[str] = mapped_column(String(40), unique=True)
    idempotency_key: Mapped[str] = mapped_column(String(80), unique=True)
    request_hash: Mapped[str] = mapped_column(String(64))
    name: Mapped[str] = mapped_column(String(100))
    phone: Mapped[str] = mapped_column(String(20))
    email: Mapped[str | None] = mapped_column(String(254))
    city: Mapped[str] = mapped_column(String(120), default='')
    preferred_contact: Mapped[str] = mapped_column(String(20))
    contact_handle: Mapped[str] = mapped_column(String(100), default='')
    comment: Mapped[str] = mapped_column(Text, default='')
    configuration: Mapped[dict | None] = mapped_column(JSONB)
    estimated_product_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    needs_delivery: Mapped[bool] = mapped_column(Boolean, default=False)
    needs_installation: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(20), default='NEW')
    telegram_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    notion_synced: Mapped[bool] = mapped_column(Boolean, default=False)
    notion_page_id: Mapped[str | None] = mapped_column(String(80))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class PricingRule(Base):
    __tablename__ = 'pricing_rules'
    __table_args__ = (UniqueConstraint('category', 'key'),)
    id: Mapped[int] = mapped_column(primary_key=True)
    category: Mapped[str] = mapped_column(String(30))
    key: Mapped[str] = mapped_column(String(80))
    label: Mapped[str] = mapped_column(String(120))
    value: Mapped[Decimal] = mapped_column(Numeric(12, 4))
    unit: Mapped[str] = mapped_column(String(30))
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class PricingChange(Base):
    __tablename__ = 'pricing_changes'
    id: Mapped[int] = mapped_column(primary_key=True)
    pricing_rule_id: Mapped[int] = mapped_column(ForeignKey('pricing_rules.id'))
    old_value: Mapped[Decimal] = mapped_column(Numeric(12, 4))
    new_value: Mapped[Decimal] = mapped_column(Numeric(12, 4))
    changed_by: Mapped[str] = mapped_column(String(80))
    source: Mapped[str] = mapped_column(String(30))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class DeliveryJob(Base):
    __tablename__ = 'delivery_jobs'
    __table_args__ = (UniqueConstraint('lead_id', 'destination'),)
    id: Mapped[int] = mapped_column(primary_key=True)
    lead_id: Mapped[int] = mapped_column(ForeignKey('leads.id'))
    destination: Mapped[str] = mapped_column(String(20))
    attempts: Mapped[int] = mapped_column(default=0)
    done: Mapped[bool] = mapped_column(default=False)
    available_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_error: Mapped[str | None] = mapped_column(String(200))

class BotSession(Base):
    __tablename__ = 'bot_sessions'
    user_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    state: Mapped[str] = mapped_column(String(40), default='menu')
    data: Mapped[dict] = mapped_column(JSONB, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class TelegramUpdate(Base):
    __tablename__ = 'telegram_updates'
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class RateBucket(Base):
    __tablename__ = 'rate_buckets'
    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    count: Mapped[int] = mapped_column(default=0)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
