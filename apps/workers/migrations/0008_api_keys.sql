CREATE TABLE IF NOT EXISTS api_keys (
  id           TEXT     PRIMARY KEY NOT NULL,
  user_id      TEXT     NOT NULL,
  key_hash     TEXT     NOT NULL UNIQUE,
  key_prefix   TEXT     NOT NULL,
  name         TEXT     NOT NULL DEFAULT 'API Key',
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_used_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
