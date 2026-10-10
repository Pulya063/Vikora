import asyncio
import json
from unittest.mock import AsyncMock

import pytest
from httpx import ASGITransport, AsyncClient
from pydantic import ValidationError
from sqlalchemy.dialects import postgresql
from sqlalchemy import select
from app.core import Settings
from app.db import session_dependency
from app.main import app
from app.models import Lead
from app.protection import RequestProtection
from app.schemas import QuoteRequest, Configuration
from test_services import configuration, rules


def quote(**changes):
    return dict(name='Тестова заявка', phone='(067) 123-45-67', consent=True, **changes)


@pytest.fixture
async def client():
    # Validation and rejection must not need a database connection.
    session = AsyncMock()
    async def db():
        yield session
    app.dependency_overrides[session_dependency] = db
    app.middleware_stack = None
    async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as result:
        yield result
    app.dependency_overrides.clear()


@pytest.mark.parametrize('field,value', [
    ('name', 'x'), ('name', 'x'*101), ('name', 'a\x00b'), ('comment', '\ud800'),
    ('comment', 'a'*2001), ('city', 'a'*121), ('phone', '+380１２３４５６７８９'),
    ('phone', '123'), ('email', 'bad@email'), ('consent', False), ('consent', 1),
    ('needs_delivery', 'false'), ('needs_installation', 1), ('website', 'spam'),
    ('status', 'APPROVED'), ('estimated_product_price', 1), ('file', 'base64:evil'),
    ('preferred_contact', 'email'), ('preferred_contact', 'Telegram'),
])
async def test_invalid_quote_does_not_reach_storage(client, monkeypatch, field, value):
    create = AsyncMock()
    monkeypatch.setattr('app.leads.LeadService.create', create)
    payload = quote()
    payload[field] = value
    response = await client.post('/api/v1/quote-requests', content=json.dumps(payload),
        headers={'Content-Type': 'application/json', 'Idempotency-Key': 'test-key-123'})
    assert response.status_code == 422, response.text
    assert response.json()['detail'] == 'Перевірте заповнені поля.'
    create.assert_not_awaited()


@pytest.mark.parametrize('change', [
    {'sections': '2'}, {'sections': True}, {'opening': ['fixed']},
    {'dimensions': {'width_mm': '1400', 'height_mm': 1200}},
    {'dimensions': {'width_mm': 1400, 'height_mm': 1200, 'sql': 'DROP TABLE leads'}},
    {'services_requested': {'delivery': 'yes'}}, {'color': 'unknown'},
    {'extras': ['warm_edge', 'warm_edge']}, {'extra_field': 'bad'},
])
def test_nested_configuration_contract(change):
    with pytest.raises(ValidationError):
        Configuration.model_validate(configuration().model_dump() | change)


async def test_estimate_accepts_frontend_configuration(client, monkeypatch):
    monkeypatch.setattr('app.main.limit', AsyncMock())
    monkeypatch.setattr('app.pricing.PricingService.rules', AsyncMock(return_value=rules()))
    response = await client.post('/api/v1/calculator/estimate', json=configuration().model_dump())
    assert response.status_code == 200
    assert response.json()['estimated_product_price_uah'] == 8776


async def test_valid_quote_normalizes_before_storage(client, monkeypatch):
    from types import SimpleNamespace
    monkeypatch.setattr('app.main.limit', AsyncMock())
    create = AsyncMock(return_value=SimpleNamespace(public_id='VKR-TEST', status='NEW'))
    monkeypatch.setattr('app.leads.LeadService.create', create)
    payload = quote(comment="Robert'); DROP TABLE leads; -- <script>alert(1)</script>")
    response = await client.post('/api/v1/quote-requests', json=payload, headers={'Idempotency-Key': 'test-key-123'})
    assert response.status_code == 201
    validated, key = create.call_args.args
    assert validated.phone == '+380671234567'
    assert validated.comment == payload['comment']  # Stored as inert text, never executed.
    statement = select(Lead).where(Lead.comment == validated.comment)
    compiled = statement.compile(dialect=postgresql.dialect())
    assert validated.comment not in str(compiled)
    assert validated.comment in compiled.params.values()


@pytest.mark.parametrize('content_type', ['multipart/form-data; boundary=evil', 'application/octet-stream', 'text/plain', 'application/x-www-form-urlencoded'])
async def test_files_and_non_json_rejected(client, content_type):
    response = await client.post('/api/v1/quote-requests', content=b'MZ malicious file', headers={'Content-Type':content_type})
    assert response.status_code == 415


async def test_body_and_origin_rejections(client):
    assert (await client.post('/api/v1/quote-requests', content=b'x'*32769, headers={'Content-Type':'application/json'})).status_code == 413
    assert (await client.post('/api/v1/quote-requests', json=quote(), headers={'Origin':'https://evil.example'})).status_code == 403
    assert (await client.post('/api/v1/quote-requests', json=quote(), headers={'Content-Encoding':'gzip'})).status_code == 415
    assert (await client.get('/api/v1/products', headers={'Host':'evil.example'})).status_code == 400


async def test_malformed_json_and_key(client):
    assert (await client.post('/api/v1/quote-requests', content='{', headers={'Content-Type':'application/json'})).status_code == 422
    assert (await client.post('/api/v1/quote-requests', json=quote(), headers={'Idempotency-Key':"';DROP TABLE--"})).status_code == 422


async def test_no_pii_in_validation_response(client):
    payload=quote()
    payload['phone']='private-invalid-phone'
    response=await client.post('/api/v1/quote-requests',json=payload,headers={'Idempotency-Key':'test-key-123'})
    assert response.status_code == 422
    assert payload['phone'] not in response.text
    assert response.headers['cache-control'] == 'no-store'


async def test_cors_preflight(client):
    response=await client.options('/api/v1/quote-requests',headers={
        'Origin':'http://localhost:3000','Access-Control-Request-Method':'POST',
        'Access-Control-Request-Headers':'Content-Type,Idempotency-Key'})
    assert response.status_code == 200
    assert response.headers['access-control-allow-origin']=='http://localhost:3000'


async def ok(scope, receive, send):
    from starlette.responses import JSONResponse
    await JSONResponse({'ok':True})(scope, receive, send)


async def test_pre_db_rate_limit_ignores_spoofed_forwarded_ip():
    guard=RequestProtection(ok,per_minute=2)
    async with AsyncClient(transport=ASGITransport(app=guard),base_url='http://test') as client:
        for _ in range(2):
            assert (await client.get('/')).status_code == 200
        response=await client.get('/',headers={'X-Forwarded-For':'1.2.3.4'})
        assert response.status_code == 429
        assert response.headers['Retry-After']=='60'


async def test_concurrency_load_sheds_and_recovers():
    started=asyncio.Event()
    release=asyncio.Event()
    async def slow(scope,receive,send):
        started.set()
        await release.wait()
        await ok(scope,receive,send)
    guard=RequestProtection(slow,max_in_flight=1)
    async with AsyncClient(transport=ASGITransport(app=guard),base_url='http://test') as client:
        first=asyncio.create_task(client.get('/'))
        await started.wait()
        responses=await asyncio.gather(*(client.get('/') for _ in range(30)))
        assert all(r.status_code==503 for r in responses)
        release.set()
        assert (await first).status_code==200
        assert guard.active==0
        assert (await client.get('/')).status_code==200


async def test_chunked_body_and_timeout():
    scope={'type':'http','method':'POST','path':'/','headers':[(b'content-type',b'application/json')],'scheme':'http'}
    for slow,expected in [(False,413),(True,408)]:
        messages=[]
        async def receive():
            if slow:
                await asyncio.sleep(1)
            return {'type':'http.request','body':b'12345','more_body':True}
        guard=RequestProtection(ok,max_body=8,body_timeout=.01)
        async def send(message): messages.append(message)
        await guard(scope,receive,send)
        assert messages[0]['status']==expected
        assert guard.active==0


async def test_production_transport():
    guard=RequestProtection(ok,require_https=True)
    async with AsyncClient(transport=ASGITransport(app=guard),base_url='http://test') as client:
        assert (await client.post('/',json=quote(),headers={'X-Forwarded-Proto':'https'})).status_code==400
        assert (await client.get('/health')).status_code==200
    async with AsyncClient(transport=ASGITransport(app=guard),base_url='https://test') as client:
        response=await client.post('/',json=quote())
        assert response.status_code==200
        assert 'max-age' in response.headers['strict-transport-security']
    with pytest.raises(ValidationError): Settings(_env_file=None,app_env='production')


async def test_dependency_failures_are_redacted(client,monkeypatch):
    from sqlalchemy.exc import OperationalError
    monkeypatch.setattr('app.main.limit',AsyncMock(side_effect=OperationalError('SQL',{},Exception('password=secret'))))
    response=await client.post('/api/v1/calculator/estimate',json=configuration().model_dump())
    assert response.status_code==503
    assert 'secret' not in response.text and 'SQL' not in response.text


@pytest.mark.parametrize('key',['short','x'*81,'key\x00invalid','key with spaces'])
async def test_non_http_keys_are_validated_before_db(key):
    from app.leads import LeadService
    session=AsyncMock()
    with pytest.raises(ValueError):
        await LeadService(session).create(QuoteRequest(**quote()),key)
    session.execute.assert_not_awaited()


async def test_webhook_bad_token_and_shape(client,monkeypatch):
    from app.core import settings
    monkeypatch.setattr(settings(),'telegram_webhook_secret','test-webhook-secret')
    response=await client.post('/api/v1/telegram/webhook',json={},headers={b'x-telegram-bot-api-secret-token':b'\xff'})
    assert response.status_code==403
    response=await client.post('/api/v1/telegram/webhook',json=[],headers={'x-telegram-bot-api-secret-token':'test-webhook-secret'})
    assert response.status_code==422
