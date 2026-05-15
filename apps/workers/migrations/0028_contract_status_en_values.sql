-- 将合同状态 value 从中文改为英文 ID，与其他选项组保持一致
-- 同时更新 clients 表中已有的 contract_status 值

UPDATE clients SET contract_status = 'Pending'    WHERE contract_status = '待签署';
UPDATE clients SET contract_status = 'Signed'     WHERE contract_status = '已签署';
UPDATE clients SET contract_status = 'Terminated' WHERE contract_status = '已终止';

UPDATE option_items SET value = 'Pending'    WHERE group_key = 'contract_status' AND value = '待签署';
UPDATE option_items SET value = 'Signed'     WHERE group_key = 'contract_status' AND value = '已签署';
UPDATE option_items SET value = 'Terminated' WHERE group_key = 'contract_status' AND value = '已终止';
