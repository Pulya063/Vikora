import asyncio
from sqlalchemy.dialects.postgresql import insert
from app.db import Session
from app.models import PricingRule
from app.pricing import SEED_VALUES, LABELS

async def main():
    async with Session() as session, session.begin():
        for category,items in SEED_VALUES.items():
            for key,value in items.items():
                await session.execute(insert(PricingRule).values(category=category,key=key,label=LABELS[category][key],value=value,unit='coefficient' if category in ['construction','profile','glass'] else 'UAH',active=True).on_conflict_do_nothing(index_elements=['category','key']))
if __name__ == '__main__': asyncio.run(main())
