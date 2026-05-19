CREATE TABLE IF NOT EXISTS system_settings (
  key   TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL DEFAULT '',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO system_settings (key, value) VALUES ('system_name',     'CRM');
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('smtp_host',       '');
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('smtp_port',       '465');
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('smtp_secure',     'true');
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('smtp_user',       '');
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('smtp_password',   '');
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('smtp_from_email', '');
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('smtp_from_name',  '');
