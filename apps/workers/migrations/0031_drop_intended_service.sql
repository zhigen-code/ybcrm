-- intended_service 列（NOT NULL + CHECK 约束）阻止了所有不带该字段的 INSERT。
-- SQLite 不允许对有 CHECK 约束的列使用 ALTER TABLE DROP COLUMN，需重建表。

CREATE TABLE leads_v2 (
    id TEXT PRIMARY KEY NOT NULL,
    source TEXT NOT NULL,
    name TEXT NOT NULL,
    contact_info TEXT NOT NULL,
    intended_services TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'New' CHECK(status IN ('New', 'Contacted', 'Qualified', 'Converted', 'Lost')),
    notes TEXT,
    assigned_to_userId TEXT,
    assigned_to_teamId TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by_userId TEXT,
    lead_no INTEGER,
    lost_reason TEXT,
    next_contact_date DATETIME,
    deleted_at TEXT,
    ad_info TEXT,
    FOREIGN KEY (assigned_to_userId) REFERENCES users(id),
    FOREIGN KEY (assigned_to_teamId) REFERENCES teams(id)
);

INSERT INTO leads_v2
    SELECT id, source, name, contact_info, intended_services, status, notes,
           assigned_to_userId, assigned_to_teamId, created_at, updated_at,
           created_by_userId, lead_no, lost_reason, next_contact_date, deleted_at, ad_info
    FROM leads;

DROP INDEX IF EXISTS idx_leads_status;
DROP INDEX IF EXISTS idx_leads_assigned_user;
DROP INDEX IF EXISTS idx_leads_assigned_team;
DROP INDEX IF EXISTS idx_leads_lead_no;

DROP TABLE leads;
ALTER TABLE leads_v2 RENAME TO leads;

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_user ON leads(assigned_to_userId);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_team ON leads(assigned_to_teamId);
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_lead_no ON leads(lead_no);
