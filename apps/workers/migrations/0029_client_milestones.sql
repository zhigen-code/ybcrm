-- 客户里程碑表：基于服务流程步骤追踪每位客户的进度
CREATE TABLE IF NOT EXISTS client_milestones (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  service_id TEXT REFERENCES services(id) ON DELETE SET NULL,
  step_index INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'skipped')),
  expected_date TEXT,
  completed_date TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_client_milestones_client ON client_milestones(client_id);
CREATE INDEX IF NOT EXISTS idx_client_milestones_status ON client_milestones(client_id, status);
