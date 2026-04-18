-- 工作流表（替代 field_policies）
CREATE TABLE IF NOT EXISTS workflows (
  id          TEXT PRIMARY KEY NOT NULL,
  name        TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  trigger     TEXT NOT NULL DEFAULT '{}',   -- JSON: {type, field, to}
  conditions  TEXT NOT NULL DEFAULT '[]',   -- JSON: 预留条件数组
  actions     TEXT NOT NULL DEFAULT '[]',   -- JSON: 动作数组
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 迁移 field_policies 数据 → workflows
INSERT INTO workflows (id, name, entity_type, trigger, conditions, actions, is_active, created_at)
SELECT
  id,
  '状态变为 ' || trigger_value,
  entity_type,
  json_object('type', 'field_change', 'field', trigger_field, 'to', trigger_value),
  '[]',
  (
    SELECT json_group_array(action) FROM (
      -- require_activity 动作
      SELECT json_object(
        'type', 'require_activity',
        'contentRequired', CAST(json_extract(policy_config, '$.activityContentRequired') AS INTEGER),
        'contentPresets',  COALESCE(json_extract(policy_config, '$.contentPresets'), json('[]'))
      ) AS action
      WHERE json_extract(policy_config, '$.requireActivity') = 1
      UNION ALL
      -- require_fields 动作（仅当 requiredFields 非空时）
      SELECT json_object(
        'type',   'require_fields',
        'fields', json_extract(policy_config, '$.requiredFields')
      ) AS action
      WHERE json_extract(policy_config, '$.requiredFields') IS NOT NULL
        AND json_array_length(json_extract(policy_config, '$.requiredFields')) > 0
    )
  ),
  is_active,
  created_at
FROM field_policies;

-- 删除旧表
DROP TABLE IF EXISTS field_policies;
