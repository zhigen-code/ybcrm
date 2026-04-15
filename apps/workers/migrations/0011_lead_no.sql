-- 为线索添加系统编号（自增整数，转化为客户后仍可通过 lead_id 关联追溯）
ALTER TABLE leads ADD COLUMN lead_no INTEGER;

-- 为现有线索按创建时间顺序补充编号（ROW_NUMBER 保证唯一）
UPDATE leads SET lead_no = (
  SELECT rn FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS rn FROM leads
  ) sub WHERE sub.id = leads.id
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_lead_no ON leads(lead_no);
