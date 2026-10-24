from mcp.server.fastmcp import FastMCP
from app.catalog import ProductService, config
from app.db import Session
from app.pricing import PricingService
from app.leads import LeadService
from app.schemas import Configuration, QuoteRequest

mcp = FastMCP('VIKORA')

@mcp.tool()
def get_products() -> list[dict]:
    """Каталог доступних вікон VIKORA."""
    return ProductService.all()

@mcp.tool()
def get_product(product_id:str) -> dict:
    """Характеристики й джерело даних виробу."""
    result=ProductService.get(product_id)
    if not result: raise ValueError('Виріб не знайдено')
    return result

@mcp.tool()
def get_product_options(product_id:str) -> list[str]:
    """Підтверджені сумісні додаткові опції."""
    return ProductService.options(product_id)

@mcp.tool()
async def calculate_estimated_price(configuration:Configuration) -> dict:
    """Тестова орієнтовна ціна виробу. Доставка й монтаж окремо."""
    async with Session() as session: return await PricingService(session).estimate(configuration)

@mcp.tool()
async def create_quote_request(request:QuoteRequest,idempotency_key:str) -> dict:
    """Створює заявку тільки за згодою клієнта; повторюйте з тим самим ключем."""
    if not 8<=len(idempotency_key)<=80: raise ValueError('Ключ має містити 8–80 символів')
    async with Session() as session,session.begin():
        lead=await LeadService(session).create(request,idempotency_key)
        return {'public_id':lead.public_id,'status':lead.status}

@mcp.tool()
def get_contact_information() -> dict:
    """Контакти й територія обслуговування. null означає ще не налаштовано."""
    return config('business')

if __name__=='__main__': mcp.run(transport='stdio')
