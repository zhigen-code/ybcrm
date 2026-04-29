-- option_items 增加 metadata 字段（存 scope 和自定义字段 schema）
ALTER TABLE option_items ADD COLUMN metadata TEXT;

-- sales_activities 增加 extra_data 字段（存里程碑自定义字段值）
ALTER TABLE sales_activities ADD COLUMN extra_data TEXT;
