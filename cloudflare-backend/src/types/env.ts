export type AppEnvironment = 'local' | 'test' | 'staging' | 'production';

export interface QueueEventMessage {
  eventId: string;
  destination: 'telegram' | 'notion';
}

export interface Env {
  DB: D1Database;
  EVENT_QUEUE: Queue<QueueEventMessage>;
  PUBLIC_RATE_LIMITER?: RateLimit;
  LEAD_RATE_LIMITER?: RateLimit;
  APP_ENV: AppEnvironment;
  ALLOWED_ORIGINS: string;
  TURNSTILE_BYPASS: string;
  TURNSTILE_SECRET?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_BOT_USERNAME?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  TELEGRAM_MANAGER_CHAT_ID?: string;
  /** Public website origin (https) used for bot link buttons. */
  PUBLIC_SITE_URL?: string;
  NOTION_TOKEN?: string;
  NOTION_DATA_SOURCE_ID?: string;
}
