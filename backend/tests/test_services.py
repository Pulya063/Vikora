import uuid
from decimal import Decimal
from types import SimpleNamespace
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select, func
from app.schemas import Configuration, QuoteRequest
from app.pricing import PricingService, SEED_VALUES
from app.models import Lead, DeliveryJob, PricingRule, PricingChange, BotSession
from app.db import Session
from app.main import app
from app.core import settings

def configuration(**overrides):
    return Configuration(profile='grand-pro',dimensions={'width_mm':1400,'height_mm':1200},sections=2,opening=['fixed','tilt_turn'],glass_unit='energy_saving',**overrides)

def rules():
    return [SimpleNamespace(category=cat,key=key,value=Decimal(str(value)),active=True) for cat,items in SEED_VALUES.items() for key,value in items.items()]

def test_formula_and_service_exclusion():
    plain=PricingService.calculate(configuration(),rules())
    services=PricingService.calculate(configuration(services_requested={'delivery':True,'installation':True}),rules())
    assert plain['estimated_product_price_uah']==8776
    assert services['estimated_product_price_uah']==plain['estimated_product_price_uah']
    assert PricingService.calculate(configuration(extras=['warm_edge']),rules())['estimated_product_price_uah']==9226
    hidden=PricingService.calculate(configuration(extras=['hidden_hardware']),rules())
    assert hidden['estimated_product_price_uah']==plain['estimated_product_price_uah']
    assert hidden['configuration']['extras']==['hidden_hardware']

def test_hidden_hardware_requires_opening_sash():
    with pytest.raises(ValueError,match='відкривної стулки'):
        fixed={**configuration().model_dump(),'construction':'fixed','sections':1,'opening':['fixed'],'extras':['hidden_hardware']}
        PricingService.calculate(Configuration(**fixed),rules())

@pytest.mark.parametrize('change',[{'width_mm':399,'height_mm':1200},{'width_mm':3001,'height_mm':1200},{'width_mm':700,'height_mm':1200}])
def test_invalid_dimensions(change):
    with pytest.raises(ValueError): Configuration(**{**configuration().model_dump(),'dimensions':change})

def test_incompatible_options():
    with pytest.raises(ValueError): PricingService.calculate(configuration(extras=['unknown']),rules())
    with pytest.raises(ValueError): PricingService.calculate(configuration(extras=['warm_edge','warm_edge']),rules())
    inactive=rules();inactive[0].active=False
    with pytest.raises(ValueError): PricingService.calculate(configuration(),inactive)

@pytest.mark.integration
@pytest.mark.asyncio(loop_scope='session')
async def test_rest_lead_idempotency_and_outbox():
    async with AsyncClient(transport=ASGITransport(app=app),base_url='http://test') as client:
        c=configuration().model_dump()
        res=await client.post('/api/v1/calculator/estimate',json=c)
        assert res.status_code==200,res.text
        estimate=res.json()
        key=str(uuid.uuid4())
        payload={'name':'Тест VIKORA','phone':'+380000000000','consent':True,'configuration':c,'pricing_version':estimate['pricing_version'],'needs_delivery':True,'needs_installation':True}
        first=await client.post('/api/v1/quote-requests',json=payload,headers={'Idempotency-Key':key})
        assert first.status_code==201,first.text
        second=await client.post('/api/v1/quote-requests',json=payload,headers={'Idempotency-Key':key})
        assert second.json()==first.json()
        conflict=await client.post('/api/v1/quote-requests',json={**payload,'name':'Інше ім’я'},headers={'Idempotency-Key':key})
        assert conflict.status_code==422
        outdated=await client.post('/api/v1/quote-requests',json={**payload,'pricing_version':'outdated'},headers={'Idempotency-Key':str(uuid.uuid4())})
        assert outdated.status_code==409
        async with Session() as session:
            lead=await session.scalar(select(Lead).where(Lead.public_id==first.json()['public_id']))
            assert lead.estimated_product_price==8776
            assert lead.configuration['services_requested']=={'delivery':True,'installation':True}
            assert await session.scalar(select(func.count()).select_from(DeliveryJob).where(DeliveryJob.lead_id==lead.id))==2
            assert not lead.telegram_sent and not lead.notion_synced

@pytest.mark.integration
@pytest.mark.asyncio(loop_scope='session')
async def test_admin_access_and_transactional_audit(monkeypatch):
    monkeypatch.setattr(settings(),'telegram_admin_ids',[123456])
    async with Session() as session:
        rule=await session.scalar(select(PricingRule).where(PricingRule.category=='profile',PricingRule.key=='comfort-pro'))
        old=rule.value
        service=PricingService(session)
        with pytest.raises(PermissionError): await service.change(rule.id,'1.21',999)
        with pytest.raises(ValueError): await service.change(rule.id,'NaN',123456)
        await service.change(rule.id,'1.21',123456,old)
        assert rule.value==Decimal('1.21')
        audit=await session.scalar(select(PricingChange).where(PricingChange.pricing_rule_id==rule.id))
        assert audit.changed_by=='123456' and audit.old_value==old
        await session.rollback()

@pytest.mark.integration
@pytest.mark.asyncio(loop_scope='session')
async def test_failed_integrations_keep_lead(monkeypatch):
    from app import worker
    async def fail(lead): raise RuntimeError('network down')
    monkeypatch.setattr(worker,'notify_manager',fail)
    monkeypatch.setattr(worker,'sync_notion',fail)
    assert await worker.run_once()
    async with Session() as session:
        job=await session.scalar(select(DeliveryJob).where(DeliveryJob.attempts>0).limit(1))
        assert job and not job.done
        assert await session.get(Lead,job.lead_id)

@pytest.mark.integration
@pytest.mark.asyncio(loop_scope='session')
async def test_mcp_and_rest_use_same_price():
    from app.mcp_server import calculate_estimated_price
    result=await calculate_estimated_price(configuration())
    async with AsyncClient(transport=ASGITransport(app=app),base_url='http://test') as client:
        rest=(await client.post('/api/v1/calculator/estimate',json=configuration().model_dump())).json()
    assert result==rest

@pytest.mark.integration
@pytest.mark.asyncio(loop_scope='session')
async def test_bot_calculator_and_duplicate_updates(monkeypatch):
    from app import bot
    sent=[]
    async def fake(method,body): sent.append(body);return {}
    monkeypatch.setattr(bot,'telegram',fake)
    uid=900000000+uuid.uuid4().int%10000000
    values=['calc','type:double','1400 1200','open:fixed','open:tilt_turn','profile:grand-pro','glass:energy_saving','result']
    for index,value in enumerate(values):
        update={'update_id':uid+index,'message':{'from':{'id':uid},'chat':{'id':uid,'type':'private'},'text':value}}
        async with Session() as session: await bot.handle_update(update,session)
    assert '8,776' in sent[-1]['text']
    count=len(sent)
    async with Session() as session: await bot.handle_update(update,session)
    assert len(sent)==count

@pytest.mark.asyncio(loop_scope='session')
async def test_webhook_rejects_unsigned_request():
    async with AsyncClient(transport=ASGITransport(app=app),base_url='http://test') as client:
        assert (await client.post('/api/v1/telegram/webhook',json={})).status_code==403

def test_manager_message_is_readable():
    from app.integrations import manager_text
    lead=SimpleNamespace(public_id='VKR-TEST',name='Тест',phone='+380000000000',city='Вінниця',preferred_contact='phone',contact_handle='',email=None,configuration=configuration().model_dump(),estimated_product_price=8776,needs_delivery=True,needs_installation=True,comment='')
    result=manager_text(lead)
    assert 'Grand Pro' in result and '1400 × 1200' in result and 'ТЕСТОВІ' in result and '"profile"' not in result
