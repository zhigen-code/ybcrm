-- 添加"系统"跟进类型（is_system=1，不可删除）
INSERT OR IGNORE INTO option_items (id, group_key, value, label, color, sort_order, is_system)
VALUES ('at-5', 'activity_type', 'System', '系统', 'gray', 99, 1);

-- 回填：将旧的 Note 类型 + 【系统】前缀记录迁移为 System 类型，并去掉前缀
-- 【系统】 共 4 个字符（【、系、统、】），SUBSTR 从第 5 个字符开始
UPDATE sales_activities
SET
  activity_type = 'System',
  description   = SUBSTR(description, 5)
WHERE description LIKE '【系统】%' AND activity_type = 'Note';
