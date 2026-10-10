from unittest.mock import AsyncMock

import pytest
from httpx import ASGITransport, AsyncClient
from app.core import settings
from app.db import session_dependency
from app.main import app

URL='/api/v1/telegram/webhook'
TOKEN={'X-Telegram-Bot-Api-Secret-Token':'test-webhook-secret'}


@pytest.fixture
async def client(monkeypatch):
    session=AsyncMock()
    async def db(): yield session
    app.dependency_overrides[session_dependency]=db
    app.middleware_stack=None
    monkeypatch.setattr(settings(),'telegram_webhook_secret',TOKEN['X-Telegram-Bot-Api-Secret-Token'])
    async with AsyncClient(transport=ASGITransport(app=app),base_url='http://test') as client:
        yield client
    app.dependency_overrides.clear()


@pytest.mark.parametrize('headers',[
    {'Origin':'http://localhost:3000'},
    {'Origin':'https://evil.example'},
    {'Sec-Fetch-Site':'same-origin'},
    {'Sec-Fetch-Mode':'no-cors'},
])
async def test_browser_access_denied_even_with_secret(client,monkeypatch,headers):
    handler=AsyncMock()
    monkeypatch.setattr('app.bot.handle_update',handler)
    response=await client.post(URL,json={'update_id':1},headers=TOKEN|headers)
    assert response.status_code==403
    assert 'access-control-allow-origin' not in response.headers
    handler.assert_not_awaited()


async def test_no_webhook_cors_preflight_or_openapi(client):
    response=await client.options(URL,headers={'Origin':'http://localhost:3000','Access-Control-Request-Method':'POST'})
    assert response.status_code==403
    assert 'access-control-allow-origin' not in response.headers
    assert URL not in app.openapi()['paths']


@pytest.mark.parametrize('body',[
    {},[],{'update_id':True},{'update_id':-1},{'update_id':2**63},
    {'update_id':1,'message':'invalid'},
    {'update_id':1,'message':{'from':{'id':'123'},'chat':{'id':123,'type':'private'}}},
    {'update_id':1,'message':{'from':{'id':123},'chat':{'id':123,'type':'private'},'text':123}},
    {'update_id':1,'callback_query':{'id':'a','from':{'id':123},'data':'x'*65}},
])
async def test_malformed_signed_event_rejected_before_bot(client,monkeypatch,body):
    handler=AsyncMock()
    monkeypatch.setattr('app.bot.handle_update',handler)
    response=await client.post(URL,json=body,headers=TOKEN)
    assert response.status_code==422
    handler.assert_not_awaited()


async def test_valid_event_uses_existing_handler(client,monkeypatch):
    handler=AsyncMock()
    monkeypatch.setattr('app.bot.handle_update',handler)
    body={'update_id':10,'message':{'message_id':20,'date':1,'from':{'id':123,'first_name':'Test'},'chat':{'id':123,'type':'private'},'text':'/start'}}
    response=await client.post(URL,json=body,headers=TOKEN)
    assert response.status_code==200
    event=handler.call_args.args[0]
    assert event=={'update_id':10,'message':{'from':{'id':123},'chat':{'id':123,'type':'private'},'text':'/start'}}


async def test_missing_secret_is_rejected_before_parsing(client,monkeypatch):
    handler=AsyncMock()
    monkeypatch.setattr('app.bot.handle_update',handler)
    response=await client.post(URL,content='{broken',headers={'Content-Type':'application/json'})
    assert response.status_code==403
    handler.assert_not_awaited()
