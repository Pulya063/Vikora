import httpx
from app.core import settings
from app.pricing import LABELS
from app.catalog import ProductService

class IntegrationUnavailable(Exception): pass

async def telegram(method, body):
    token = settings().telegram_bot_token
    if not token: raise IntegrationUnavailable('telegram_not_configured')
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(f'https://api.telegram.org/bot{token}/{method}',json=body)
        if not response.is_success: raise IntegrationUnavailable(f'telegram_http_{response.status_code}')
        result = response.json()
        if not result.get('ok'): raise IntegrationUnavailable('telegram_rejected')
        return result['result']

def manager_text(lead):
    lines = [f'НОВА ЗАЯВКА — {lead.public_id}', '', lead.name,lead.phone,lead.city,
        f'Бажаний зв’язок: {lead.preferred_contact}',lead.contact_handle,lead.email or '']
    c = lead.configuration
    if c:
        p = ProductService.get(c['profile'])
        lines += ['', 'ВІКНО', p['name'], f"{c['dimensions']['width_mm']} × {c['dimensions']['height_mm']} мм",f"Секцій: {c['sections']}",
            'Відкривання: '+', '.join(LABELS['opening'][v] for v in c['opening']), LABELS['glass'][c['glass_unit']],
            'Додатково: '+(', '.join(LABELS['accessory'][v] for v in c['extras']) or 'без опцій'),
            f'Орієнтовна вартість виробу: ≈ {lead.estimated_product_price:,.0f} грн', 'ТЕСТОВІ ЦІНИ']
    lines += ['', 'Доставка: '+('потрібна' if lead.needs_delivery else 'не зазначена'),'Монтаж: '+('потрібен' if lead.needs_installation else 'не зазначений'),'Послуги розраховуються окремо.',lead.comment]
    return '\n'.join(lines)[:4000]

async def notify_manager(lead):
    cfg = settings()
    if not cfg.telegram_manager_chat_id: raise IntegrationUnavailable('manager_chat_not_configured')
    body = {'chat_id':cfg.telegram_manager_chat_id,'text':manager_text(lead)}
    if lead.notion_page_id:
        body['reply_markup'] = {'inline_keyboard':[[{'text':'Відкрити заявку','url':'https://notion.so/'+lead.notion_page_id.replace('-','')}]]}
    await telegram('sendMessage',body)

async def sync_notion(lead):
    cfg = settings()
    if not cfg.notion_token or not cfg.notion_data_source_id: raise IntegrationUnavailable('notion_not_configured')
    headers={'Authorization':f'Bearer {cfg.notion_token}','Notion-Version':'2025-09-03'}
    def rich(v): return {'rich_text':[{'text':{'content':str(v)[:1900]}}]}
    properties={'Lead ID':rich(lead.public_id),'Customer':{'title':[{'text':{'content':lead.name}}]},'Phone':{'phone_number':lead.phone},'City':rich(lead.city),
        'Product':rich(ProductService.get(lead.configuration['profile'])['name'] if lead.configuration else 'Консультація'),
        'Estimate':{'number':float(lead.estimated_product_price) if lead.estimated_product_price is not None else None},'Delivery':{'checkbox':lead.needs_delivery},'Installation':{'checkbox':lead.needs_installation},
        'Created':{'date':{'start':lead.created_at.isoformat()}},'Preferred Contact':{'select':{'name':lead.preferred_contact}},'Status':{'status':{'name':lead.status}}}
    async with httpx.AsyncClient(timeout=20,headers=headers,base_url='https://api.notion.com/v1') as client:
        page_id = lead.notion_page_id
        if not page_id:
            found = await client.post(f'/data_sources/{cfg.notion_data_source_id}/query',json={'filter':{'property':'Lead ID','rich_text':{'equals':lead.public_id}}})
            if not found.is_success: raise IntegrationUnavailable(f'notion_query_{found.status_code}')
            results = found.json().get('results',[])
            if results: page_id = results[0]['id']
        if page_id:
            response = await client.patch(f'/pages/{page_id}',json={'properties':properties})
        else:
            response = await client.post('/pages',json={'parent':{'type':'data_source_id','data_source_id':cfg.notion_data_source_id},'properties':properties,
                'children':[{'object':'block','type':'paragraph','paragraph':{'rich_text':[{'type':'text','text':{'content':manager_text(lead)[:1900]}}]}}]})
        if not response.is_success: raise IntegrationUnavailable(f'notion_http_{response.status_code}')
        return response.json()['id']
