CREATE TABLE IF NOT EXISTS admin_records (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('products', 'payments')),
  details TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS admin_records_kind ON admin_records(kind, updated_at);
