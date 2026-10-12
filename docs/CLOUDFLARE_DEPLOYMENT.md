# Cloudflare deployment runbook

Жоден Cloudflare resource цими файлами автоматично не створюється і production не змінюється. Поточні UUID та домени у `wrangler.jsonc` є безпечними placeholder; workflow відмовиться запускати deployment, доки їх не замінено.

## Підготовка staging

1. Створити окремі D1 databases `vikora-staging` і `vikora-production`.
2. Створити queues `vikora-events-staging`, `vikora-events`, а також відповідні DLQ.
3. Записати реальні D1 UUID та HTTPS origins у відповідні `env` секції `cloudflare-backend/wrangler.jsonc`.
4. Додати Worker secrets окремо для кожного environment:
   - `TURNSTILE_SECRET`
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_WEBHOOK_SECRET`
   - `NOTION_TOKEN`
5. Задати vars `NOTION_DATA_SOURCE_ID`, `TELEGRAM_MANAGER_CHAT_ID` і реальний `TELEGRAM_BOT_USERNAME` без `@`; останній використовується для локальної ініціалізації grammY без запиту `getMe` на кожен webhook.
6. Додати дозволені Telegram IDs безпосередньо в `bot_admins` через параметризований/контрольований D1 command.
7. У GitHub Environment variables задати `API_URL`, `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_SITE_URL` і `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. `API_URL` та `NEXT_PUBLIC_API_BASE_URL` мають бути однаковими HTTPS URL API Worker: браузер звертається напряму до нього, щоб edge rate limit мав адресу клієнта; origin сайту потрібно додати до `ALLOWED_ORIGINS`. Workflow передає `API_URL` як runtime variable frontend Worker і зберігає інші Cloudflare vars через `--keep-vars`.

Cloudflare API token для GitHub має мати лише доступ до потрібних Workers Scripts, D1 і Queues конкретного account. У GitHub Environments `staging` та `production` потрібні secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` і variable `CLOUDFLARE_DEPLOY_ENABLED=true`. Для `production` увімкнути required reviewers.

## Deployment

Запускати `Deploy Cloudflare (manual)` спочатку з target `staging`. Workflow повторює весь CI, перевіряє відсутність placeholder, застосовує remote D1 migrations, деплоїть API Worker, а після нього збирає і деплоїть Next.js через OpenNext. Production запускається тим самим workflow через захищений GitHub Environment. R2 cache не підключений, тому workflow не створює R2 bucket.

Telegram webhook встановлюється лише після перевірки staging URL. URL має закінчуватися `/internal/telegram/webhook`, а `secret_token` має збігатися з Worker secret. Цей endpoint не використовується frontend.

## Перевірка після deployment

- `GET /health` повертає 200.
- `GET /api/prices` та `GET /api/contacts` повертають очікувані версії з cache headers.
- Synthetic lead проходить Turnstile, записується один раз при повторному Idempotency-Key і має два outbox events.
- Queue окремо завершує Telegram та Notion deliveries; `/status` показує нуль `failed/dead`.
- Telegram admin команди відхиляють ID, якого немає в `bot_admins`.
- Контакти й ціни після зміни стають видимими не пізніше TTL кешу.

## Rollback

1. Відкотити Worker через Cloudflare deployment history або `wrangler rollback --env <environment>`.
2. Не виконувати destructive D1 downgrade. Міграції мають бути forward-compatible; виправлення додається новою migration.
3. Якщо cutover уже виконано, повернути frontend API URL на перевірений FastAPI endpoint. Python backend і PostgreSQL зберігаються саме для цього перехідного rollback.
4. Після інциденту повторити pending/dead outbox deliveries з Telegram admin dashboard.
