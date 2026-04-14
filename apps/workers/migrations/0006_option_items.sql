-- 创建可配置选项表
CREATE TABLE IF NOT EXISTS option_items (
  id         TEXT    PRIMARY KEY NOT NULL,
  group_key  TEXT    NOT NULL,
  value      TEXT    NOT NULL,
  label      TEXT    NOT NULL,
  color      TEXT    NOT NULL DEFAULT 'gray',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active  INTEGER NOT NULL DEFAULT 1,
  is_system  INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(group_key, value)
);

CREATE INDEX IF NOT EXISTS idx_option_items_group
  ON option_items(group_key, is_active, sort_order);

-- 线索状态（is_system=1，value 不可改/不可删）
INSERT OR IGNORE INTO option_items (id, group_key, value, label, color, sort_order, is_system) VALUES
  ('ls-1', 'lead_status', 'New',       '新线索', 'blue',   1, 1),
  ('ls-2', 'lead_status', 'Contacted', '已联系', 'yellow', 2, 1),
  ('ls-3', 'lead_status', 'Qualified', '已确认', 'gray',   3, 1),
  ('ls-4', 'lead_status', 'Converted', '已转化', 'green',  4, 1),
  ('ls-5', 'lead_status', 'Lost',      '已丢失', 'red',    5, 1);

-- 合同状态（完全可配置）
INSERT OR IGNORE INTO option_items (id, group_key, value, label, color, sort_order) VALUES
  ('cs-1', 'contract_status', '待签署', '待签署', 'yellow', 1),
  ('cs-2', 'contract_status', '已签署', '已签署', 'green',  2),
  ('cs-3', 'contract_status', '已终止', '已终止', 'red',    3);

-- 跟进类型（完全可配置，重建表后无 CHECK 约束）
INSERT OR IGNORE INTO option_items (id, group_key, value, label, color, sort_order) VALUES
  ('at-1', 'activity_type', 'Call',    '电话', 'blue',   1),
  ('at-2', 'activity_type', 'Meeting', '会面', 'purple', 2),
  ('at-3', 'activity_type', 'Email',   '邮件', 'green',  3),
  ('at-4', 'activity_type', 'Note',    '备注', 'gray',   4);

-- 合作伙伴类型（完全可配置，重建表后无 CHECK 约束）
INSERT OR IGNORE INTO option_items (id, group_key, value, label, color, sort_order) VALUES
  ('pt-1', 'partner_type', 'FertilityCenter',    '生殖中心', 'blue',   1),
  ('pt-2', 'partner_type', 'SurrogacyAgency',    '代孕机构', 'purple', 2),
  ('pt-3', 'partner_type', 'EggDonationAgency',  '供卵机构', 'green',  3);

-- 重建 sales_activities 表，移除 activity_type CHECK 约束
CREATE TABLE sales_activities_new (
  id            TEXT     PRIMARY KEY NOT NULL,
  client_id     TEXT,
  lead_id       TEXT,
  user_id       TEXT     NOT NULL,
  activity_type TEXT     NOT NULL,
  description   TEXT,
  activity_date DATETIME NOT NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (lead_id)   REFERENCES leads(id),
  FOREIGN KEY (user_id)   REFERENCES users(id)
);

INSERT INTO sales_activities_new
  SELECT id, client_id, lead_id, user_id, activity_type, description, activity_date, created_at
  FROM sales_activities;

DROP TABLE sales_activities;
ALTER TABLE sales_activities_new RENAME TO sales_activities;

CREATE INDEX IF NOT EXISTS idx_sa_client ON sales_activities(client_id);
CREATE INDEX IF NOT EXISTS idx_sa_lead   ON sales_activities(lead_id);

-- 重建 partners 表，移除 type CHECK 约束
CREATE TABLE partners_new (
  id             TEXT     PRIMARY KEY NOT NULL,
  name           TEXT     NOT NULL,
  type           TEXT     NOT NULL,
  contact_person TEXT,
  contact_info   TEXT,
  service_scope  TEXT     DEFAULT '[]',
  api_config     TEXT,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO partners_new
  SELECT id, name, type, contact_person, contact_info, service_scope, api_config, created_at, updated_at
  FROM partners;

DROP TABLE partners;
ALTER TABLE partners_new RENAME TO partners;
