# Запуск у Docker

Запустіть Docker Desktop у режимі Linux containers. З кореня проєкту:

```sh
docker compose up --build -d
```

- Сайт: http://localhost:3000
- API: http://localhost:8000/docs
- PostgreSQL: localhost:55432

`app` очікує готовності PostgreSQL, застосовує міграції Alembic та додає
початкові тестові ціни (без перезапису наявних), після чого запускає API.
`front` очікує готовності API. Запити `/api/v1/*` із сайту спрямовуються
до `app:8000` через внутрішню мережу Compose.

Усі параметри задаються в `.env` у корені проєкту; шаблон — `.env.example`.
Якщо `.env` відсутній, скопіюйте `.env.example` у `.env`.
Compose передає налаштування БД, API та інтеграцій відповідним сервісам.
`DATABASE_URL` використовує ім'я контейнера `db`, а `API_URL` — `app`.
Для спеціальних символів у паролі потрібне URL-кодування в `DATABASE_URL`.
`API_URL`, `NEXT_PUBLIC_SITE_URL` та `ALLOW_INDEXING` вбудовуються під час
збирання, тому після їх зміни повторіть запуск із `--build`.
Для Telegram і Notion заповніть відповідні поля власними ключами та ID;
для звичайного локального запуску вони можуть залишатися порожніми.
Контейнери не завантажують локальні `.env` з папок backend/frontend.
Кореневий `.env` виключено з Git та контексту збирання Docker.

```sh
docker compose logs -f app front
docker compose down
```

Дані БД зберігаються в томі `vikora_db` після `docker compose down`.
Порти 3000, 8000 та 55432 мають бути вільними.
