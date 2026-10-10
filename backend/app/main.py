import hashlib
import secrets
from datetime import datetime, timezone, timedelta
from typing import Annotated
from fastapi import FastAPI, Depends, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy import text, delete
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import SQLAlchemyError
from app.core import settings
from app.db import session_dependency
from app.models import RateBucket
from app.catalog import ProductService, config
from app.pricing import PricingService, LABELS
from app.schemas import Configuration, QuoteRequest
from app.leads import LeadService, PriceChanged

app = FastAPI(title='VIKORA API',version='1.0.0')
app.add_middleware(CORSMiddleware,allow_origins=settings().allowed_origins,allow_methods=['GET','POST'],allow_headers=['Content-Type','Idempotency-Key'])
DB = Annotated[object,Depends(session_dependency)]

@app.exception_handler(ValueError)
async def value_error(request,exc): return JSONResponse(status_code=422,content={'detail':str(exc)})
@app.exception_handler(PriceChanged)
async def price_error(request,exc): return JSONResponse(status_code=409,content={'detail':str(exc),'estimate':exc.estimate})
@app.exception_handler(SQLAlchemyError)
async def db_error(request,exc): return JSONResponse(status_code=503,content={'detail':'Сервіс тимчасово недоступний. Спробуйте пізніше.'})
@app.exception_handler(RequestValidationError)
async def validation_error(request,exc):
    return JSONResponse(status_code=422,content={'detail':'Перевірте заповнені поля.', 'errors':[{'field':'.'.join(map(str,e['loc'])),'message':e['msg']} for e in exc.errors()]})

@app.middleware('http')
async def body_limit(request,call_next):
    if request.method == 'POST':
        body = bytearray()
        async for chunk in request.stream():
            body.extend(chunk)
            if len(body)>32768: return JSONResponse(status_code=413,content={'detail':'Запит завеликий'})
        request._body = bytes(body)
    response = await call_next(request)
    response.headers['X-Content-Type-Options']='nosniff'
    return response

async def limit(session,request,kind,maximum):
    now = datetime.now(timezone.utc)
    host = request.client.host if request.client else 'unknown'
    # Production proxy must preserve verified client addresses; never trust arbitrary XFF.
    key = kind+':'+hashlib.sha256(host.encode()).hexdigest()+':'+str(int(now.timestamp())//60)
    stmt = insert(RateBucket).values(key=key,count=1,expires_at=now+timedelta(minutes=2)).on_conflict_do_update(index_elements=['key'],set_={'count':RateBucket.count+1}).returning(RateBucket.count)
    count = (await session.execute(stmt)).scalar_one()
    await session.execute(delete(RateBucket).where(RateBucket.expires_at<now))
    await session.commit()
    if count>maximum: raise HTTPException(429,'Забагато запитів. Спробуйте за хвилину.')

@app.get('/health')
async def health(session:DB):
    await session.execute(text('SELECT 1'))
    return {'status':'ok'}
@app.get('/api/v1/products')
async def products(): return ProductService.all()
@app.get('/api/v1/products/{product_id}')
async def product(product_id:str):
    p = ProductService.get(product_id)
    if not p: raise HTTPException(404,'Виріб не знайдено')
    return p
@app.get('/api/v1/products/{product_id}/options')
async def product_options(product_id:str): return ProductService.options(product_id)
@app.get('/api/v1/contact-information')
async def contacts(): return config('business')
@app.get('/api/v1/technologies')
async def technologies(): return config('technologies')
@app.get('/api/v1/calculator/options')
async def options(): return {'products':ProductService.all(),'labels':LABELS,'is_mock':True,'measurement_options':['mosquito_net','window_sill','exterior_sill']}
@app.post('/api/v1/calculator/estimate')
async def estimate(c:Configuration,request:Request,session:DB):
    await limit(session,request,'estimate',60)
    return await PricingService(session).estimate(c)
@app.post('/api/v1/quote-requests',status_code=201)
async def quote(data:QuoteRequest,request:Request,session:DB,idempotency_key:Annotated[str,Header(min_length=8,max_length=80)]):
    await limit(session,request,'quote',8)
    lead = await LeadService(session).create(data,idempotency_key)
    await session.commit()
    return {'public_id':lead.public_id,'status':lead.status,'message':'Заявку збережено'}
@app.post('/api/v1/telegram/webhook')
async def webhook(request:Request,session:DB,x_telegram_bot_api_secret_token:Annotated[str|None,Header()]=None):
    secret = settings().telegram_webhook_secret
    if not secret or not secrets.compare_digest(x_telegram_bot_api_secret_token or '',secret): raise HTTPException(403,'Forbidden')
    from app.bot import handle_update
    await handle_update(await request.json(),session)
    return {'ok':True}
