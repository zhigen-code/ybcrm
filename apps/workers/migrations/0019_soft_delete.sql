ALTER TABLE leads ADD COLUMN deleted_at TEXT;
ALTER TABLE clients ADD COLUMN deleted_at TEXT;
ALTER TABLE services ADD COLUMN deleted_at TEXT;
ALTER TABLE partners ADD COLUMN deleted_at TEXT;
