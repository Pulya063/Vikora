PRAGMA foreign_keys = ON;

CREATE TABLE leads (
  id TEXT PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  idempotency_key TEXT NOT NULL UNIQUE,
  request_hash TEXT NOT NULL,
  name TEXT NOT NULL CHECK(length(name) BETWEEN 2 AND 100),
  phone TEXT NOT NULL CHECK(length(phone) <= 20),
  email TEXT,
  city TEXT NOT NULL DEFAULT '',
  preferred_contact TEXT NOT NULL CHECK(preferred_contact IN ('phone','Telegram','Viber','WhatsApp','email')),
  contact_handle TEXT NOT NULL DEFAULT '',
  comment TEXT NOT NULL DEFAULT '',
  configuration_json TEXT,
  estimated_product_price_uah INTEGER,
  needs_delivery INTEGER NOT NULL DEFAULT 0 CHECK(needs_delivery IN (0,1)),
  needs_installation INTEGER NOT NULL DEFAULT 0 CHECK(needs_installation IN (0,1)),
  status TEXT NOT NULL DEFAULT 'NEW' CHECK(status IN ('NEW','CONTACTED','QUALIFIED','CLOSED','SPAM')),
  notion_page_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_status_created ON leads(status, created_at DESC);

CREATE TABLE prices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  value_micros INTEGER NOT NULL CHECK(value_micros >= 0),
  unit TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  version INTEGER NOT NULL DEFAULT 1,
  last_operation_id TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(category, key)
);
CREATE INDEX idx_prices_active ON prices(active, category, key);

CREATE TABLE contacts (
  key TEXT PRIMARY KEY,
  value TEXT,
  kind TEXT NOT NULL CHECK(kind IN ('phone','email','address','url','text')),
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  version INTEGER NOT NULL DEFAULT 1,
  last_operation_id TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE bot_admins (
  telegram_user_id INTEGER PRIMARY KEY,
  display_name TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  actor_type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  old_value_json TEXT,
  new_value_json TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id, created_at DESC);

CREATE TABLE outbox_events (
  id TEXT PRIMARY KEY,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  destination TEXT NOT NULL CHECK(destination IN ('telegram','notion')),
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','queued','processing','completed','failed','dead')),
  attempts INTEGER NOT NULL DEFAULT 0,
  available_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  locked_until TEXT,
  last_error_code TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  completed_at TEXT,
  UNIQUE(aggregate_type, aggregate_id, event_type, destination)
);
CREATE INDEX idx_outbox_dispatch ON outbox_events(status, available_at);
CREATE INDEX idx_outbox_stale ON outbox_events(status, locked_until);

CREATE TABLE integration_delivery_status (
  event_id TEXT NOT NULL REFERENCES outbox_events(id) ON DELETE CASCADE,
  destination TEXT NOT NULL CHECK(destination IN ('telegram','notion')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','completed','failed','dead')),
  attempts INTEGER NOT NULL DEFAULT 0,
  external_id TEXT,
  last_error_code TEXT,
  last_attempt_at TEXT,
  delivered_at TEXT,
  PRIMARY KEY(event_id, destination)
);

CREATE TABLE telegram_updates (
  update_id INTEGER PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','processed','failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  last_error_code TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE bot_sessions (
  telegram_user_id INTEGER PRIMARY KEY,
  state TEXT NOT NULL DEFAULT 'menu',
  data_json TEXT NOT NULL DEFAULT '{}',
  nonce TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE rate_limits (
  key TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL,
  PRIMARY KEY(key, window_start)
);
CREATE INDEX idx_rate_expiry ON rate_limits(expires_at);
