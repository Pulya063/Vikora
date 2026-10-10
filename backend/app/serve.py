"""Portable host entry point; migrations are a separate release step."""
import ipaddress
import os
import uvicorn


def server_options():
    port = int(os.getenv('PORT', '8000'))
    if not 1 <= port <= 65535:
        raise ValueError('PORT must be between 1 and 65535')
    proxies = [entry.strip() for entry in os.getenv('TRUSTED_PROXY_IPS', '').split(',') if entry.strip()]
    for entry in proxies:
        # No wildcard trust; configure the provider's verified ingress addresses.
        ipaddress.ip_network(entry, strict=False)
    return dict(host='0.0.0.0', port=port, proxy_headers=bool(proxies),
        forwarded_allow_ips=','.join(proxies), limit_concurrency=64,
        backlog=128, timeout_keep_alive=5)


if __name__ == '__main__':
    uvicorn.run('app.main:app', **server_options())
