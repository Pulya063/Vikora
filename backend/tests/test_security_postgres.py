"""Real PostgreSQL guarantees; never substitute SQLite or mocks for these tests."""
import asyncio
import uuid

import pytest
from fastapi import HTTPException
from sqlalchemy import select, func
from starlette.requests import Request
from app.db import Session
from app.leads import LeadService
from app.main import limit
from app.models import Lead, DeliveryJob
from app.schemas import QuoteRequest

pytestmark = [pytest.mark.integration, pytest.mark.asyncio(loop_scope='session')]


async def test_concurrent_retries_and_sql_payload_are_safe():
    key=str(uuid.uuid4())
    payload=QuoteRequest(name="O'Brien",phone='+380671234567',consent=True,
        comment="'); DROP TABLE leads; -- <script>alert(1)</script>")
    async def create():
        async with Session() as session,session.begin():
            return (await LeadService(session).create(payload,key)).public_id
    identifiers=await asyncio.gather(*(create() for _ in range(6)))
    assert len(set(identifiers))==1
    async with Session() as session:
        lead=await session.scalar(select(Lead).where(Lead.idempotency_key==key))
        assert lead.comment==payload.comment and lead.name==payload.name
        assert await session.scalar(select(func.count()).select_from(Lead).where(Lead.idempotency_key==key))==1
        assert await session.scalar(select(func.count()).select_from(DeliveryJob).where(DeliveryJob.lead_id==lead.id))==2


async def test_lead_and_outbox_rollback_together():
    key=str(uuid.uuid4())
    with pytest.raises(RuntimeError,match='rollback'):
        async with Session() as session,session.begin():
            lead=await LeadService(session).create(QuoteRequest(name='Тест',phone='+380671234567',consent=True),key)
            identifier=lead.id
            raise RuntimeError('rollback')
    async with Session() as session:
        assert await session.get(Lead,identifier) is None
        assert await session.scalar(select(func.count()).select_from(DeliveryJob).where(DeliveryJob.lead_id==identifier))==0


async def test_shared_database_rate_limit():
    request=Request({'type':'http','client':('127.0.0.1',1234)})
    kind='test-'+uuid.uuid4().hex[:8]
    for _ in range(2):
        async with Session() as session: await limit(session,request,kind,2)
    async with Session() as session:
        with pytest.raises(HTTPException) as caught:
            await limit(session,request,kind,2)
        assert caught.value.status_code==429
        assert caught.value.headers['Retry-After']=='60'


async def test_webhook_final_result_uses_shared_lead_and_outbox(monkeypatch):
    from httpx import ASGITransport, AsyncClient
    from app.main import app
    from app.core import settings
    from app import bot
    from unittest.mock import AsyncMock
    monkeypatch.setattr(settings(),'telegram_webhook_secret','test-secret')
    sent=AsyncMock(return_value={})
    monkeypatch.setattr(bot,'telegram',sent)
    uid=1000000000+uuid.uuid4().int%100000000
    values=['calc','type:double','1400 1200','open:fixed','open:tilt_turn','profile:grand-pro',
        'glass:energy_saving','result','lead','Webhook test','+380671234567','Вінниця','services:both','submit']
    async with AsyncClient(transport=ASGITransport(app=app),base_url='http://test') as client:
        for index,value in enumerate(values):
            update={'update_id':uid+index,'message':{'from':{'id':uid},'chat':{'id':uid,'type':'private'},'text':value}}
            response=await client.post('/api/v1/telegram/webhook',json=update,headers={'X-Telegram-Bot-Api-Secret-Token':'test-secret'})
            assert response.status_code==200,response.text
        count=sent.await_count
        response=await client.post('/api/v1/telegram/webhook',json=update,headers={'X-Telegram-Bot-Api-Secret-Token':'test-secret'})
        assert response.status_code==200
        assert sent.await_count==count
    async with Session() as session:
        lead=await session.scalar(select(Lead).where(Lead.idempotency_key==f"telegram:{update['update_id']}"))
        assert lead and lead.estimated_product_price==8776
        assert lead.needs_delivery and lead.needs_installation
        assert await session.scalar(select(func.count()).select_from(DeliveryJob).where(DeliveryJob.lead_id==lead.id))==2
