"""Deterministic private-chat bot. Pricing and leads never reimplemented here."""
import asyncio
from copy import deepcopy
from decimal import Decimal, InvalidOperation
from sqlalchemy import select, text
from sqlalchemy.dialects.postgresql import insert
from app.core import settings
from app.db import Session
from app.models import BotSession, TelegramUpdate, PricingRule
from app.integrations import telegram
from app.catalog import ProductService, config
from app.pricing import PricingService, LABELS
from app.schemas import Configuration, QuoteRequest
from app.leads import LeadService, PriceChanged

def buttons(items): return {'inline_keyboard':[[{'text':label,'callback_data':value}] for label,value in items]}
MENU=[('🪟 Розрахувати вікно','calc'),('📋 Каталог','catalog'),('💡 Технології','tech'),('☎️ Зв’язатися з менеджером','contact')]

async def handle_update(update,session):
    event = update.get('callback_query') or update.get('message') or {}
    user = event.get('from',{})
    message = event.get('message') if 'callback_query' in update else event
    chat = (message or {}).get('chat',{})
    uid = user.get('id')
    if not isinstance(uid,int) or chat.get('type') != 'private' or not isinstance(update.get('update_id'),int): return
    await session.execute(text('SELECT pg_advisory_xact_lock(:key)'),{'key':uid})
    inserted = (await session.execute(insert(TelegramUpdate).values(id=update['update_id']).on_conflict_do_nothing().returning(TelegramUpdate.id))).scalar_one_or_none()
    if inserted is None:
        await session.rollback()
        return
    state = await session.get(BotSession,uid)
    if state is None:
        state = BotSession(user_id=uid,state='menu',data={})
        session.add(state)
    data = deepcopy(state.data)
    history = data.pop('_history', [])
    last_prompt = data.pop('_prompt', 'Головне меню')
    last_items = data.pop('_items', MENU)
    previous = {'state':state.state,'data':deepcopy(data),'prompt':last_prompt,'items':last_items}
    value = event.get('data') or event.get('text','')
    async def send(content,items=None):
        nonlocal last_prompt,last_items
        last_prompt=content;last_items=items or [('Головне меню','menu')]
        await telegram('sendMessage',{'chat_id':chat['id'],'text':content,'reply_markup':buttons(last_items)})
    try:
        if value in ['/back','back']:
            if history:
                previous_step=history.pop();state.state=previous_step['state'];data=previous_step['data']
                await send(previous_step['prompt'],previous_step['items'])
            else: await send('Ви на початку діалогу.',MENU)
        elif value in ['/start','/cancel','menu']:
            state.state='menu'; data={};history=[]
            await send('Вітаємо у VIKORA 👋\nДопоможемо підібрати вікна та орієнтовно розрахувати їхню вартість.\nЗараз використовуються тестові ціни.',MENU)
        elif value=='catalog':
            await send('\n\n'.join(p['name']+'\n'+p['description'] for p in ProductService.all()),[('Розрахувати','calc')])
        elif value=='tech':
            await send('\n\n'.join(t['name']+' — '+t['benefit'] for t in config('technologies')))
        elif value=='contact':
            state.state='lead_name'; data={}
            await send('Залишимо заявку менеджеру. Як до вас звертатися? Надішліть ім’я.')
        elif value=='/prices' or value=='prices':
            if uid not in settings().telegram_admin_ids: raise PermissionError('Немає доступу')
            state.state='admin';data={}
            await send('Налаштування калькулятора',[(label,'category:'+cat) for cat,label in [('base','Базова та мінімальна ціна'),('profile','Профілі'),('glass','Склопакети'),('opening','Відкривання'),('accessory','Комплектуючі'),('construction','Конструкції')]])
        elif value.startswith(('category:','rule:','confirm_price')) or state.state=='admin_value':
            if uid not in settings().telegram_admin_ids: raise PermissionError('Немає доступу')
            if value.startswith('category:'):
                rules=await session.scalars(select(PricingRule).where(PricingRule.category==value.split(':')[1]))
                await send('Оберіть правило',[(r.label,f'rule:{r.id}') for r in rules])
            elif value.startswith('rule:'):
                rule=await session.get(PricingRule,int(value.split(':')[1]))
                if not rule: raise ValueError('Правило не знайдено')
                data={'rule':rule.id,'old':str(rule.value)};state.state='admin_value'
                await send(f'{rule.label}\nПоточне значення: {rule.value}\nВведіть нове значення:')
            elif value=='confirm_price' and state.state=='admin_confirm':
                await PricingService(session).change(data['rule'],data['new'],uid,data['old'])
                state.state='admin';data={}
                await send('Значення оновлено. Зміну записано в аудит.',[('Налаштування','prices')])
            elif state.state=='admin_value':
                proposed=Decimal(value.replace(',','.'))
                if not proposed.is_finite(): raise ValueError('Введіть скінченне число')
                data['new']=str(proposed);state.state='admin_confirm'
                await send(f"Змінити {data['old']} → {data['new']}?",[('Підтвердити','confirm_price'),('Скасувати','prices')])
            else: raise ValueError('Відкрийте /prices повторно')
        elif value=='calc':
            state.state='type';data={}
            await send('Оберіть тип вікна',[(v,'type:'+k) for k,v in LABELS['construction'].items()])
        elif value.startswith('type:') and state.state=='type':
            kind=value.split(':')[1]
            if kind not in LABELS['construction']: raise ValueError('Невідомий тип')
            data={'construction':kind,'sections':{'fixed':1,'single':1,'double':2,'triple':3}[kind],'color':'white','extras':[],'opening':[]}
            state.state='size'
            await send('Введіть ширину й висоту в мм, наприклад: 1400 1200',[('Змінити тип','calc')])
        elif state.state=='size':
            width,height=map(int,value.lower().replace('×',' ').replace('x',' ').split())
            data['dimensions']={'width_mm':width,'height_mm':height}
            if data['construction']=='fixed':
                data['opening']=['fixed'];state.state='profile'
                await send('Оберіть профіль',[(p['name'],'profile:'+p['id']) for p in ProductService.all()])
            else:
                state.state='opening'
                await send('Відкривання секції 1',[(v,'open:'+k) for k,v in LABELS['opening'].items()])
        elif value.startswith('open:') and state.state=='opening':
            data['opening'].append(value.split(':')[1])
            if len(data['opening'])<data['sections']:
                await send(f"Відкривання секції {len(data['opening'])+1}",[(v,'open:'+k) for k,v in LABELS['opening'].items()])
            else:
                state.state='profile'
                await send('Оберіть профіль',[(p['name'],'profile:'+p['id']) for p in ProductService.all()])
        elif value.startswith('profile:') and state.state=='profile':
            data['profile']=value.split(':')[1];p=ProductService.get(data['profile'])
            if not p: raise ValueError('Профіль не знайдено')
            state.state='glass'
            await send('Оберіть склопакет',[(LABELS['glass'][k],'glass:'+k) for k in p['glassOptions']])
        elif (value.startswith('glass:') and state.state=='glass') or (value.startswith('extra:') and state.state=='extras'):
            if value.startswith('glass:'): data['glass_unit']=value.split(':')[1]
            else:
                key=value.split(':')[1]
                if key not in ProductService.options(data['profile']): raise ValueError('Опція недоступна')
                if key in data['extras']: data['extras'].remove(key)
                else: data['extras'].append(key)
            state.state='extras'
            await send('Додаткові опції. Транспортування та встановлення за потреби обговорюємо з менеджером окремо.',[(('✓ ' if k in data['extras'] else '')+LABELS['accessory'][k],'extra:'+k) for k in ProductService.options(data['profile'])]+[('Розрахувати','result'),('Почати знову','calc')])
        elif value=='result' and state.state=='extras':
            estimate=await PricingService(session).estimate(Configuration.model_validate(data))
            data={'configuration':estimate['configuration'],'pricing_version':estimate['pricing_version']};state.state='result'
            c=estimate['configuration']
            await send(f"Орієнтовна вартість: ≈ {estimate['estimated_product_price_uah']:,} грн\nТестові ціни.\n{ProductService.get(c['profile'])['name']}\n{c['dimensions']['width_mm']} × {c['dimensions']['height_mm']} мм\nСекцій: {c['sections']}\n{LABELS['glass'][c['glass_unit']]}\nДоставка та монтаж окремо. Остаточна вартість після заміру.",[('Отримати точний розрахунок','lead'),('Почати знову','calc')])
        elif value=='lead' and state.state=='result':
            state.state='lead_name';await send('Як до вас звертатися?')
        elif state.state=='lead_name':
            if len(value)<2 or len(value)>100: raise ValueError('Ім’я має містити 2–100 символів')
            data['name']=value;state.state='lead_phone';await send('Надішліть телефон у форматі +380XXXXXXXXX.')
        elif state.state=='lead_phone':
            data['phone']=QuoteRequest.normalize_phone(value);state.state='lead_city';await send('Ваш населений пункт?')
        elif state.state=='lead_city':
            data['city']=value[:120];state.state='lead_services'
            await send('Які послуги потрібні?', [('Доставка й монтаж','services:both'),('Доставка','services:delivery'),('Монтаж','services:installation'),('Лише виріб','services:none')])
        elif value.startswith('services:') and state.state=='lead_services':
            choice=value.split(':')[1]
            data.update(needs_delivery=choice in ['both','delivery'],needs_installation=choice in ['both','installation']);state.state='consent'
            await send('Передамо ім’я, телефон, місто й конфігурацію менеджеру для відповіді на заявку. Бажаний зв’язок — телефон. Погоджуєтеся на обробку цих даних?', [('Погоджуюсь, надіслати','submit'),('Скасувати','menu')])
        elif value=='submit' and state.state=='consent':
            lead=await LeadService(session).create(QuoteRequest(**data,consent=True),f"telegram:{update['update_id']}")
            state.state='menu';data={}
            # Save before sending confirmation; retry cannot lose the committed lead.
            state.data=data
            await session.commit()
            await send(f'Заявку {lead.public_id} збережено. Дякуємо!',MENU)
            return
        else: await send('Скористайтеся меню або /cancel.',MENU)
    except PriceChanged as exc:
        data['pricing_version']=exc.estimate['pricing_version']
        await send(f"Ціни оновлено: ≈ {exc.estimate['estimated_product_price_uah']} грн. Підтвердьте надсилання.",[('Підтвердити','submit'),('Скасувати','menu')])
    except (ValueError,PermissionError,InvalidOperation) as exc:
        await send(str(exc)[:500]+'\nМожна почати знову: /start')
    if value not in ['/start','/cancel','menu','/back','back'] and state.state!=previous['state']:
        history.append(previous)
    state.data={**data,'_history':history[-12:],'_prompt':last_prompt,'_items':last_items}
    await session.commit()
    if 'callback_query' in update:
        try: await telegram('answerCallbackQuery',{'callback_query_id':event['id']})
        except Exception: pass

async def poll():
    offset=0
    while True:
        try:
            updates=await telegram('getUpdates',{'offset':offset,'timeout':10,'allowed_updates':['message','callback_query']})
            for update in updates:
                async with Session() as session: await handle_update(update,session)
                offset=update['update_id']+1
        except Exception:
            await asyncio.sleep(5)

if __name__=='__main__': asyncio.run(poll())
