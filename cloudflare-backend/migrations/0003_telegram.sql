-- Fence webhook completion against a newer owner after a failed/expired lease.
ALTER TABLE telegram_updates ADD COLUMN lease_token TEXT;
CREATE INDEX idx_telegram_update_recovery ON telegram_updates(status, locked_until);

-- Sessions expire and confirmation nonces are consumed in the same D1 batch as edits.
ALTER TABLE bot_sessions ADD COLUMN expires_at TEXT;
