-- 线索表：新增多意向服务 JSON 数组列（保留旧列供兼容）
ALTER TABLE leads ADD COLUMN intended_services TEXT NOT NULL DEFAULT '[]';
UPDATE leads SET intended_services = json_array(intended_service);

-- 客户表：新增多服务套餐 JSON 数组列（保留旧列供兼容）
ALTER TABLE clients ADD COLUMN service_plans TEXT NOT NULL DEFAULT '[]';
UPDATE clients SET service_plans = CASE
  WHEN service_plan IS NOT NULL AND service_plan != '' THEN json_array(service_plan)
  ELSE '[]'
END;
