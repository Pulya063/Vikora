"""Never run integration tests against the ordinary application database."""
import os
import uuid

import pytest
import pytest_asyncio
from sqlalchemy.engine import make_url

test_url = os.getenv('VIKORA_TEST_DATABASE_URL')
if test_url:
    if not (make_url(test_url).database or '').endswith('_test'):
        raise pytest.UsageError('VIKORA_TEST_DATABASE_URL must name a dedicated database ending in _test')
    os.environ['DATABASE_URL'] = test_url


def pytest_collection_modifyitems(items):
    for item in items:
        if item.get_closest_marker('integration'):
            if not test_url:
                item.add_marker(pytest.mark.skip(reason='Set VIKORA_TEST_DATABASE_URL to a dedicated PostgreSQL *_test database'))


@pytest_asyncio.fixture(scope='session', loop_scope='session', autouse=True)
async def postgres_schema():
    if not test_url:
        yield
        return
    from sqlalchemy import text
    from app.db import engine, Base
    from app.seed import main as seed
    schema = 'test_' + uuid.uuid4().hex
    # Generated identifier only; application input is never interpolated into SQL.
    async with engine.begin() as connection:
        await connection.execute(text(f'CREATE SCHEMA "{schema}"'))
    engine.update_execution_options(schema_translate_map={None: schema})
    try:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        await seed()
        yield
    finally:
        async with engine.begin() as connection:
            await connection.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
        await engine.dispose()
