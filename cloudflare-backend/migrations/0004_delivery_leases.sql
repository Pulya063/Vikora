ALTER TABLE outbox_events ADD COLUMN lease_token TEXT;
ALTER TABLE outbox_events ADD COLUMN dispatch_token TEXT;
ALTER TABLE outbox_events ADD COLUMN dispatch_locked_until TEXT;
ALTER TABLE outbox_events ADD COLUMN ambiguous_since TEXT;
ALTER TABLE outbox_events ADD COLUMN revision INTEGER NOT NULL DEFAULT 1;

-- Serializes external writes for a lead, including different event revisions.
CREATE TABLE integration_locks (
  aggregate_id TEXT NOT NULL,
  destination TEXT NOT NULL CHECK(destination IN ('notion','telegram')),
  lease_token TEXT NOT NULL,
  locked_until TEXT NOT NULL,
  PRIMARY KEY (aggregate_id, destination)
);
CREATE INDEX idx_outbox_queued_recovery ON outbox_events(status, updated_at);
