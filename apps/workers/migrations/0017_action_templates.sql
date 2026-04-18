-- 动作模板表（工作流动作库）
CREATE TABLE IF NOT EXISTS action_templates (
  id         TEXT PRIMARY KEY NOT NULL,
  name       TEXT NOT NULL,
  type       TEXT NOT NULL,   -- require_activity | require_fields | set_field | send_email | webhook
  config     TEXT NOT NULL DEFAULT '{}',  -- JSON，动作具体参数
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
