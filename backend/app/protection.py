"""Bound admitted HTTP work before reading bodies or opening DB sessions."""
import asyncio
import time
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

TELEGRAM_WEBHOOK_PATH = '/api/v1/telegram/webhook'


class PublicCORSMiddleware(CORSMiddleware):
    """The server-to-server Telegram webhook never participates in browser CORS."""
    async def __call__(self, scope, receive, send):
        if scope.get('path', '').rstrip('/') == TELEGRAM_WEBHOOK_PATH:
            return await self.app(scope, receive, send)
        return await super().__call__(scope, receive, send)


class RequestProtection:
    def __init__(self, app, max_in_flight=32, max_body=32768, body_timeout=10,
                 per_minute=120, allowed_origins=(), require_https=False):
        self.app = app
        self.max_in_flight = max_in_flight
        self.max_body = max_body
        self.body_timeout = body_timeout
        self.active = 0
        self.per_minute = per_minute
        self.allowed_origins = set(allowed_origins)
        self.require_https = require_https
        self.clients = {}
        self.window = -1

    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http':
            return await self.app(scope, receive, send)

        async def secured_send(message):
            if message['type'] == 'http.response.start':
                message['headers'] = [*message.get('headers', []),
                    (b'x-content-type-options', b'nosniff'),
                    (b'cache-control', b'no-store'),
                    (b'referrer-policy', b'no-referrer')]
                if self.require_https and scope.get('scheme') == 'https':
                    message['headers'].append((b'strict-transport-security', b'max-age=31536000'))
            await send(message)

        async def reject(status, detail):
            response = JSONResponse({'detail': detail}, status_code=status,
                headers={'Retry-After': '60' if status == 429 else '3'} if status in {429, 503} else {})
            await response(scope, receive, secured_send)

        headers = dict(scope.get('headers', []))
        if scope['path'].rstrip('/') == TELEGRAM_WEBHOOK_PATH:
            if b'origin' in headers or any(name.startswith(b'sec-fetch-') for name in headers):
                return await reject(403, 'Server-to-server endpoint')
        # A plain HTTP redirect cannot undo disclosure of an already sent POST body.
        if self.require_https and scope.get('scheme') != 'https' and scope['path'] != '/health':
            return await reject(400, 'HTTPS required')
        window = int(time.monotonic() // 60)
        if window != self.window:
            self.clients.clear()
            self.window = window
        client = (scope.get('client') or ('unknown', 0))[0]
        # Deliberately ignore client-supplied X-Forwarded-For. Memory stays bounded.
        if client not in self.clients and len(self.clients) >= 4096:
            return await reject(503, 'Сервіс тимчасово перевантажений')
        self.clients[client] = self.clients.get(client, 0) + 1
        if self.clients[client] > self.per_minute:
            return await reject(429, 'Забагато запитів. Спробуйте за хвилину.')

        if scope['method'] in {'POST', 'PUT', 'PATCH'}:
            origin = headers.get(b'origin')
            if origin is not None and origin.decode('latin1') not in self.allowed_origins:
                return await reject(403, 'Недозволене джерело запиту')
            if headers.get(b'content-type', b'').split(b';', 1)[0].strip().lower() != b'application/json':
                return await reject(415, 'Підтримується лише JSON; завантаження файлів заборонене')
            if headers.get(b'content-encoding', b'identity').lower() != b'identity':
                return await reject(415, 'Стиснені запити не підтримуються')
        if b'content-length' in headers:
            try:
                length = int(headers[b'content-length'])
                if length < 0:
                    raise ValueError
            except ValueError:
                return await reject(400, 'Некоректна довжина запиту')
            if length > self.max_body:
                return await reject(413, 'Запит завеликий')

        if self.active >= self.max_in_flight:
            return await reject(503, 'Сервіс перевантажений. Спробуйте за кілька секунд.')
        # No await between check and increment: atomic within this worker's event loop.
        self.active += 1
        try:
            if scope['method'] in {'POST', 'PUT', 'PATCH'}:
                body = bytearray()
                try:
                    async with asyncio.timeout(self.body_timeout):
                        while True:
                            message = await receive()
                            if message['type'] == 'http.disconnect':
                                return
                            chunk = message.get('body', b'')
                            if len(body) + len(chunk) > self.max_body:
                                return await reject(413, 'Запит завеликий')
                            body.extend(chunk)
                            if not message.get('more_body', False):
                                break
                except TimeoutError:
                    return await reject(408, 'Час очікування запиту вичерпано')
                delivered = False

                async def buffered_receive():
                    nonlocal delivered
                    if not delivered:
                        delivered = True
                        return {'type': 'http.request', 'body': bytes(body), 'more_body': False}
                    return await receive()
                receiver = buffered_receive
            else:
                receiver = receive

            await self.app(scope, receiver, secured_send)
        finally:
            self.active -= 1
