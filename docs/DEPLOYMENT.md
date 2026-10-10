# Підготовка VIKORA до хостингу

VIKORA обслуговує невелику локальну територію — Вінницю та Вінницьку область. На поточному етапі пріоритети: передбачувана місячна ціна, простий супровід, резервні копії PostgreSQL і безпечний ручний запуск після перевірок.

## Рекомендація

Почати з Render. Для цього навантаження AWS не дає помітної користі, але додає IAM, мережі, TLS, журнали, резервні копії та більше варіантів помилкової конфігурації. Код і контейнери залишають можливість перейти на AWS пізніше.

Орієнтир Render станом на 10 жовтня 2026 року:

| Компонент | Мінімальний платний варіант |
|---|---:|
| Next.js frontend | $7/місяць |
| FastAPI | $7/місяць |
| PostgreSQL Basic 256 MB | $6/місяць |
| PostgreSQL storage | від $0.30/GB/місяць |
| Worker Telegram/Notion | ще $7/місяць, коли інтеграції вмикаються |

Отже, сайт без worker — приблизно **$20.30/місяць**, із worker — приблизно **$27.30/місяць**, плюс домен і перевищення трафіку. Безкоштовний PostgreSQL придатний лише для короткої демонстрації: база закінчує дію через 30 днів. У безкоштовному workspace включено 5 GB трафіку, далі діє оплата за GB; поточний каталог зображень важить понад 20 MB, тому після запуску слід перевірити фактичний трафік і кешування.

## Порівняння з AWS

Найдешевший практичний AWS-шлях — Lightsail із Docker. Linux instance на 2 GB коштує близько $12/місяць. Якщо тримати PostgreSQL на тому самому сервері, ціна нижча, але оновлення, backup, відновлення і доступність БД стають нашою відповідальністю. Managed database Lightsail починається від $15/місяць, а базовий план не має шифрування даних; наступний за розміром коштує $30/місяць. Разом це приблизно $27–42/місяць до додаткових сервісів.

Повний AWS-варіант із RDS PostgreSQL, окремим compute, S3, DNS, журналами й backup зазвичай коштуватиме більше та потребуватиме більше супроводу. S3 зараз не потрібен: сайт не приймає файли, а статичні зображення збираються разом із frontend. Для майбутніх завантажень користувачів S3 слід додати через presigned URL, перевірку типу/розміру та окреме сканування.

## Підготовлений CI/CD

- `.github/workflows/ci.yml` запускає PostgreSQL 17, Alembic, backend/Telegram/контрактні тести, TypeScript, браузерні тести, Compose validation і збірку обох Docker images.
- `.github/workflows/deploy-render.yml` запускається лише вручну з `main`, повторно виконує CI та деплоїть точний перевірений commit у вже створені Render services.
- CD спочатку перевіряє repository, branch і вимкнений auto-deploy. Платні ресурси він не створює.
- Поки `DEPLOY_ENABLED` не дорівнює `true`, запуск deployment зупиняється до будь-якого запиту на деплой.

Коли вирішимо запускати Render, потрібно створити frontend, API, PostgreSQL і за потреби worker в одному регіоні. Після цього в GitHub Environment `production` додаються:

- secret `RENDER_API_KEY`;
- variables `DEPLOY_ENABLED=true`, `RENDER_API_SERVICE_ID`, `RENDER_FRONT_SERVICE_ID`;
- optional `RENDER_WORKER_SERVICE_ID`, лише коли Telegram/Notion delivery увімкнено.

Для production бажано ввімкнути required reviewers у GitHub Environment. У Render auto-deploy слід вимкнути, щоб production змінювався тільки після ручного workflow та успішного CI.

## Telegram

Єдиний endpoint залишається `/api/v1/telegram/webhook`. Він прихований з OpenAPI, не проксіюється frontend, не бере участі у CORS і відхиляє browser-originated запити. Підписані Telegram updates проходять Pydantic-валідацію, далі використовують існуючий `handle_update`, `LeadService`, таблицю `leads` та transactional outbox. Нові endpoint-и не створені.

Webhook вмикається лише після появи production HTTPS URL і секрету `TELEGRAM_WEBHOOK_SECRET`. Telegram надсилає секрет у `X-Telegram-Bot-Api-Secret-Token`; URL webhook не слід відкривати з frontend-коду.

## Перед фактичним запуском

1. Вибрати Render і бюджет, створити ресурси в одному європейському регіоні.
2. Налаштувати production environment variables, внутрішній PostgreSQL URL, TLS, домен і backup.
3. Застосувати Alembic migration та seed як контрольований release step.
4. Запустити ручний workflow, перевірити health, форму, запис у PostgreSQL, outbox і журнали.
5. Лише після цього встановити Telegram webhook; worker можна залишити відсутнім до готовності інтеграції.

Джерела цін: https://render.com/pricing, https://render.com/docs/free, https://aws.amazon.com/lightsail/pricing/. Перед оплатою ціни треба перевірити ще раз у вибраному регіоні та акаунті.
