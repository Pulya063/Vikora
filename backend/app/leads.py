import hashlib
import json
import uuid
from sqlalchemy import select, text
from app.models import Lead, DeliveryJob
from app.pricing import PricingService

class PriceChanged(ValueError):
    def __init__(self, estimate):
        super().__init__('Ціни оновлено. Підтвердьте новий розрахунок.')
        self.estimate = estimate

class LeadService:
    def __init__(self, session): self.session = session

    async def create(self, request, key):
        digest = hashlib.sha256(json.dumps(request.model_dump(mode='json'), sort_keys=True).encode()).hexdigest()
        # Serialize concurrent repeats across web/bot/MCP processes.
        lock_id = int.from_bytes(hashlib.sha256(key.encode()).digest()[:8], 'big', signed=True)
        await self.session.execute(text('SELECT pg_advisory_xact_lock(:key)'), {'key':lock_id})
        old = await self.session.scalar(select(Lead).where(Lead.idempotency_key == key))
        if old:
            if old.request_hash != digest: raise ValueError('Ключ повторного запиту вже використано для іншої заявки')
            return old
        estimate = None
        configuration = None
        if request.configuration:
            c = request.configuration.model_copy(update={'services_requested':request.configuration.services_requested.model_copy(update={'delivery':request.needs_delivery,'installation':request.needs_installation})})
            estimate = await PricingService(self.session).estimate(c)
            if request.pricing_version != estimate['pricing_version']: raise PriceChanged(estimate)
            configuration = {**estimate['configuration'],'supplier':estimate['supplier'],'estimated_product_price_uah':estimate['estimated_product_price_uah'],'pricing_version':estimate['pricing_version'],'is_mock':True}
        lead = Lead(public_id='VKR-'+uuid.uuid4().hex[:12].upper(), idempotency_key=key, request_hash=digest,
            **request.model_dump(exclude={'configuration','pricing_version','consent','website'}),
            configuration=configuration, estimated_product_price=estimate['estimated_product_price_uah'] if estimate else None)
        self.session.add(lead)
        await self.session.flush()
        self.session.add_all([DeliveryJob(lead_id=lead.id,destination=dest) for dest in ['telegram','notion']])
        await self.session.flush()
        return lead
