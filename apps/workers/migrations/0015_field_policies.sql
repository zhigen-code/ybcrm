-- 字段策略表
CREATE TABLE IF NOT EXISTS field_policies (
  id            TEXT PRIMARY KEY NOT NULL,
  entity_type   TEXT NOT NULL,
  trigger_field TEXT NOT NULL,
  trigger_value TEXT NOT NULL,
  policy_config TEXT NOT NULL,
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(entity_type, trigger_field, trigger_value)
);

-- leads 表新增字段
ALTER TABLE leads ADD COLUMN lost_reason TEXT;
ALTER TABLE leads ADD COLUMN next_contact_date DATETIME;

-- sales_activities 表新增下次联系时间字段
ALTER TABLE sales_activities ADD COLUMN next_contact_date DATETIME;

-- 丢失原因选项组
INSERT OR IGNORE INTO option_items (id, group_key, value, label, color, sort_order) VALUES
  ('lr-1', 'lost_reason', '价格问题', '价格问题', 'red',    1),
  ('lr-2', 'lost_reason', '选择竞品', '选择竞品', 'red',    2),
  ('lr-3', 'lost_reason', '需求不符', '需求不符', 'yellow', 3),
  ('lr-4', 'lost_reason', '暂时搁置', '暂时搁置', 'gray',   4),
  ('lr-5', 'lost_reason', '无法联系', '无法联系', 'gray',   5),
  ('lr-6', 'lost_reason', '其他',     '其他',     'gray',   6);

-- 默认字段策略（三种线索状态变更场景）
INSERT OR IGNORE INTO field_policies (id, entity_type, trigger_field, trigger_value, policy_config) VALUES
  ('fp-lead-contacted', 'lead', 'status', 'Contacted',
   '{"requireActivity":true,"activityContentRequired":false,"contentPresets":["电话未接通","已加微信未回","下次联系","等跟进"]}'),
  ('fp-lead-qualified', 'lead', 'status', 'Qualified',
   '{"requireActivity":true,"activityContentRequired":true,"requiredFields":[{"field":"nextContactDate","label":"下次联系时间","type":"datetime"},{"field":"intendedServices","label":"意向服务","type":"services"}]}'),
  ('fp-lead-lost',      'lead', 'status', 'Lost',
   '{"requireActivity":true,"activityContentRequired":false,"requiredFields":[{"field":"lostReason","label":"丢失原因","type":"select","optionGroup":"lost_reason"}]}');
