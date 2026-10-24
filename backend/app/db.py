from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.engine import make_url
import ssl
from app.core import settings

class Base(DeclarativeBase):
    pass

def connection_options():
    cfg = settings()
    url = make_url(cfg.database_url)
    # Do not pass libpq-only sslmode to asyncpg or silently accept weaker TLS.
    mode = url.query.get('sslmode', cfg.database_ssl_mode)
    if mode not in {'disable', 'verify-full'}:
        raise ValueError('Use DATABASE_SSL_MODE=verify-full for cloud PostgreSQL')
    options = {'timeout': 5, 'command_timeout': 10,
               'server_settings': {'statement_timeout': '10000', 'lock_timeout': '3000'}}
    if mode == 'verify-full':
        options['ssl'] = ssl.create_default_context(cafile=cfg.database_ssl_ca_file or None)
    elif 'ssl' in url.query:
        raise ValueError('Configure database TLS with DATABASE_SSL_MODE instead of ssl URL parameters')
    else:
        options['ssl'] = False
    return url.difference_update_query(['sslmode', 'ssl']), options


db_url, connect_options = connection_options()
engine = create_async_engine(
    db_url, pool_pre_ping=True, pool_size=5,
    max_overflow=5, pool_timeout=3,
    connect_args=connect_options,
)
Session = async_sessionmaker(engine, expire_on_commit=False)

async def session_dependency():
    async with Session() as session:
        yield session
