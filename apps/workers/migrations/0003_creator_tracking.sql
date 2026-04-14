-- 为线索和客户表添加创建人字段
ALTER TABLE leads ADD COLUMN created_by_userId TEXT;
ALTER TABLE clients ADD COLUMN created_by_userId TEXT;
