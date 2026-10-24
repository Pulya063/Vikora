import asyncio
import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from app.db import Session
from app.models import DeliveryJob, Lead
from app.integrations import notify_manager, sync_notion

async def run_once():
    async with Session() as session, session.begin():
        job = await session.scalar(select(DeliveryJob).where(DeliveryJob.done.is_(False),DeliveryJob.available_at <= datetime.now(timezone.utc)).order_by(DeliveryJob.available_at).with_for_update(skip_locked=True).limit(1))
        if job is None: return False
        lead = await session.get(Lead,job.lead_id)
        try:
            if job.destination == 'telegram':
                await notify_manager(lead)
                lead.telegram_sent = True
            else:
                lead.notion_page_id = await sync_notion(lead)
                lead.notion_synced = True
            job.done = True
            job.last_error = None
        except Exception as exc:
            job.attempts += 1
            # Never persist URLs, tokens, or customer payloads from exception strings.
            job.last_error = type(exc).__name__
            job.available_at = datetime.now(timezone.utc) + timedelta(seconds=min(3600,30 * 2**min(job.attempts,7)))
        return True

async def main():
    while True:
        try:
            if not await run_once(): await asyncio.sleep(3)
        except Exception as exc:
            logging.error('Worker unavailable: %s',type(exc).__name__)
            await asyncio.sleep(10)

if __name__ == '__main__': asyncio.run(main())
