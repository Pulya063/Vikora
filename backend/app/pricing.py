from decimal import Decimal, ROUND_HALF_UP
import hashlib
from sqlalchemy import select
from app.models import PricingRule, PricingChange
from app.catalog import ProductService
from app.schemas import Configuration

LABELS = {
 'base': {'area':'Базова ціна за м²', 'minimum':'Мінімальна ціна'},
 'construction': {'fixed':'Глухе','single':'Одностулкове','double':'Двостулкове','triple':'Тристулкове'},
 'profile': {'grand-pro':'Grand Pro · 72 мм','comfort':'Comfort · 70 мм','comfort-pro':'Comfort Pro · 76 мм'},
 'glass': {'standard':'Стандартний','energy_saving':'Енергозберігаючий','solar_control':'Сонцезахисний'},
 'opening': {'fixed':'Глухе','turn':'Поворотне','tilt_turn':'Поворотно-відкидне'},
 'accessory': {'warm_edge':'Тепла рамка','child_lock':'Дитячий замок','upgraded_hardware':'Посилена фурнітура','hidden_hardware':'Повністю прихована фурнітура activPilot Select','mosquito_net':'Москітна сітка','window_sill':'Підвіконня','exterior_sill':'Відлив'}
}
SEED_VALUES = {'base': {'area':3500,'minimum':3000}, 'construction':{'fixed':1,'single':1.05,'double':1.12,'triple':1.2}, 'profile':{'grand-pro':1,'comfort':1.1,'comfort-pro':1.18}, 'glass':{'standard':1,'energy_saving':1.12,'solar_control':1.25}, 'opening':{'fixed':0,'turn':1000,'tilt_turn':1400}, 'accessory':{'warm_edge':450,'child_lock':350,'upgraded_hardware':1200,'mosquito_net':850,'window_sill':600,'exterior_sill':400}}
QUOTE_ONLY_ACCESSORIES = {'hidden_hardware'}

class PricingService:
    def __init__(self, session): self.session = session

    async def rules(self):
        return list((await self.session.scalars(select(PricingRule).where(PricingRule.active).order_by(PricingRule.id))).all())

    @staticmethod
    def calculate(c: Configuration, rules):
        p = ProductService.get(c.profile)
        if not p: raise ValueError('Оберіть доступну профільну систему')
        if c.glass_unit not in p['glassOptions']: raise ValueError('Склопакет потребує уточнення сумісності')
        # Sized accessories need measurement, so never assert blanket compatibility.
        if any(x not in p['compatibleOptions'] for x in c.extras): raise ValueError('Опція потребує перевірки менеджера')
        if 'child_lock' in c.extras and all(x == 'fixed' for x in c.opening): raise ValueError('Дитячий замок потребує відкривної стулки')
        if 'hidden_hardware' in c.extras and all(x == 'fixed' for x in c.opening): raise ValueError('Прихована фурнітура потребує відкривної стулки')
        values = {(r.category,r.key): Decimal(r.value) for r in rules if r.active}
        def val(cat,key):
            if (cat,key) not in values: raise ValueError('Ціна цієї комплектації тимчасово недоступна')
            return values[cat,key]
        area = Decimal(c.dimensions.width_mm) * Decimal(c.dimensions.height_mm) / Decimal(1000000)
        structure = val('base','area') * area * val('construction',c.construction) * val('profile',c.profile) * val('glass',c.glass_unit)
        opening = sum((val('opening',v) for v in c.opening), Decimal(0))
        extras = sum((val('accessory',v) for v in c.extras if v not in QUOTE_ONLY_ACCESSORIES), Decimal(0))
        total = max(val('base','minimum'), structure+opening+extras).quantize(Decimal('1'), rounding=ROUND_HALF_UP)
        fingerprint = '|'.join(f'{k}:{v}' for k,v in sorted(values.items()))
        return {'estimated_product_price_uah':int(total),'currency':'UAH','is_mock':True,'pricing_version':hashlib.sha256(fingerprint.encode()).hexdigest()[:16], 'breakdown':{'structure':float(structure.quantize(Decimal('.01'))),'opening':float(opening),'accessories':float(extras),'minimum_applied': val('base','minimum') > structure+opening+extras},'configuration':c.model_dump(), 'supplier':p['supplier']}

    async def estimate(self,c): return self.calculate(c,await self.rules())

    async def change(self, rule_id, value, user_id, expected_old=None):
        from app.core import settings
        if user_id not in settings().telegram_admin_ids: raise PermissionError('Немає доступу')
        value = Decimal(str(value))
        if not value.is_finite(): raise ValueError('Значення має бути скінченним числом')
        rule = await self.session.scalar(select(PricingRule).where(PricingRule.id == rule_id).with_for_update())
        if not rule: raise ValueError('Правило не знайдено')
        if expected_old is not None and rule.value != Decimal(str(expected_old)): raise ValueError('Ціну вже змінено. Відкрийте правило повторно.')
        is_coef = rule.category in ['construction','profile','glass']
        if not (Decimal('.1') <= value <= 10 if is_coef else 0 <= value <= 100000): raise ValueError('Значення поза допустимими межами')
        self.session.add(PricingChange(pricing_rule_id=rule.id,old_value=rule.value,new_value=value,changed_by=str(user_id),source='telegram_admin'))
        rule.value = value
        await self.session.flush()
