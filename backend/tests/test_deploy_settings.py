import ssl
import pytest
from app.core import Settings, settings
from app.db import connection_options
from app.serve import server_options


@pytest.mark.parametrize('scheme',['postgres','postgresql','postgresql+asyncpg'])
def test_managed_database_url(scheme):
    cfg=Settings(_env_file=None,database_url=f'{scheme}://user:password@localhost/vikora')
    assert cfg.database_url=='postgresql+asyncpg://user:password@localhost/vikora'


def test_database_tls_checks_certificate_and_hostname(monkeypatch):
    monkeypatch.setattr(settings(),'database_url','postgresql+asyncpg://user:password@db.example/vikora?sslmode=verify-full')
    monkeypatch.setattr(settings(),'database_ssl_ca_file','')
    url, options=connection_options()
    assert 'sslmode' not in url.query
    assert options['ssl'].verify_mode==ssl.CERT_REQUIRED
    assert options['ssl'].check_hostname


def test_database_does_not_silently_downgrade_tls(monkeypatch):
    monkeypatch.setattr(settings(),'database_url','postgresql+asyncpg://user:password@db.example/vikora?sslmode=require')
    with pytest.raises(ValueError,match='verify-full'): connection_options()


def test_host_port_and_explicit_proxy_trust(monkeypatch):
    monkeypatch.setenv('PORT','10000')
    monkeypatch.setenv('TRUSTED_PROXY_IPS','127.0.0.1,10.42.0.0/24')
    options=server_options()
    assert options['port']==10000 and options['proxy_headers'] is True
    assert options['forwarded_allow_ips']=='127.0.0.1,10.42.0.0/24'
    monkeypatch.setenv('TRUSTED_PROXY_IPS','')
    assert server_options()['proxy_headers'] is False
    monkeypatch.setenv('TRUSTED_PROXY_IPS','*')
    with pytest.raises(ValueError): server_options()
