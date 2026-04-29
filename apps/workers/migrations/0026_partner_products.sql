CREATE TABLE partner_products (
  id TEXT PRIMARY KEY,
  partner_id TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  service_id TEXT NOT NULL REFERENCES services(id),
  name TEXT NOT NULL,
  description TEXT,
  price REAL,
  currency TEXT DEFAULT 'USD',
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_partner_products_partner ON partner_products(partner_id);
CREATE INDEX idx_partner_products_service ON partner_products(service_id);
