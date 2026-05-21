CREATE TABLE IF NOT EXISTS api_lead_failures (
    id TEXT PRIMARY KEY NOT NULL,
    request_body TEXT NOT NULL,
    error_message TEXT,
    api_key_prefix TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    resolved_by_user_id TEXT,
    resolution TEXT CHECK(resolution IN ('created_lead', 'dismissed'))
);

CREATE INDEX IF NOT EXISTS idx_api_lead_failures_resolved ON api_lead_failures(resolved_at);
CREATE INDEX IF NOT EXISTS idx_api_lead_failures_created ON api_lead_failures(created_at DESC);
