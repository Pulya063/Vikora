import asyncio
from alembic import context
from sqlalchemy.ext.asyncio import create_async_engine
from app.core import settings
from app.db import Base, connection_options
from app import models

def apply(connection):
    context.configure(connection=connection,target_metadata=Base.metadata,compare_type=True)
    with context.begin_transaction(): context.run_migrations()

async def online():
    url, options = connection_options()
    engine = create_async_engine(url, connect_args=options)
    async with engine.connect() as connection: await connection.run_sync(apply)
    await engine.dispose()

if context.is_offline_mode():
    context.configure(url=settings().database_url,target_metadata=Base.metadata,literal_binds=True)
    with context.begin_transaction(): context.run_migrations()
else: asyncio.run(online())
