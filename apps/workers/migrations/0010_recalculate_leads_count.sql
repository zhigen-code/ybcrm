-- 重新统计所有用户的活跃线索数
-- 活跃线索定义：assigned_to_userId = 当前用户 且 status 不为 Converted/Lost
UPDATE users SET current_leads_count = (
  SELECT COUNT(*)
  FROM leads
  WHERE leads.assigned_to_userId = users.id
    AND leads.status NOT IN ('Converted', 'Lost')
);
