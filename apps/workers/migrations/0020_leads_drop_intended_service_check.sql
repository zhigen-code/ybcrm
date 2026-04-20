-- 重建 leads 表，去掉 intended_service 列上的 NOT NULL + CHECK 约束
-- SQLite 不支持 ALTER COLUMN，只能通过重建表来修改约束

PRAGMA foreign_keys = OFF;

CREATE TABLE leads_new (
    id TEXT PRIMARY KEY NOT NULL,
    lead_no INTEGER,
    source TEXT NOT NULL,
    name TEXT NOT NULL,
    contact_info TEXT NOT NULL,
    intended_service TEXT,
    intended_services TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'New',
    notes TEXT,
    lost_reason TEXT,
    next_contact_date TEXT,
    assigned_to_userId TEXT,
    assigned_to_teamId TEXT,
    created_by_userId TEXT,
    deleted_at TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_to_userId) REFERENCES users(id),
    FOREIGN KEY (assigned_to_teamId) REFERENCES teams(id),
    FOREIGN KEY (created_by_userId) REFERENCES users(id)
);

INSERT INTO leads_new SELECT
    id, lead_no, source, name, contact_info,
    intended_service, intended_services, status, notes,
    lost_reason, next_contact_date,
    assigned_to_userId, assigned_to_teamId, created_by_userId,
    deleted_at, created_at, updated_at
FROM leads;

DROP TABLE leads;
ALTER TABLE leads_new RENAME TO leads;

PRAGMA foreign_keys = ON;
