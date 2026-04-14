-- 初始管理员账号（密码: Admin@123456，生产环境请立即修改）
-- bcrypt hash of "Admin@123456"
INSERT OR IGNORE INTO users (id, email, password_hash, name, role)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'admin@example.com',
    '$2a$12$B7w.qCYouhn1d3MYzcYmCu9Tud9CySjCwRBi4PsyvTNwmJbP.KtPe',
    '系统管理员',
    'admin'
);

-- 基础服务数据
INSERT OR IGNORE INTO services (id, name, description, process_steps) VALUES
('svc-001', '赴美试管', '赴美体外受精辅助生殖服务', '["初步咨询", "医疗评估", "方案制定", "签署合同", "赴美准备", "取卵手术", "胚胎培育", "移植手术", "追踪随访"]'),
('svc-002', '代孕', '美国合法代孕全程服务', '["初步咨询", "资质评估", "代孕妈妈匹配", "签署协议", "医疗流程", "孕期管理", "分娩接生", "法律公证", "回国手续"]'),
('svc-003', '供精', '精子库捐精辅助生殖服务', '["初步咨询", "精子库选择", "医疗方案", "人工授精/试管", "追踪随访"]'),
('svc-004', '供卵', '卵子捐赠辅助生殖服务', '["初步咨询", "供卵方匹配", "同步方案", "取卵移植手术", "追踪随访"]');

-- 默认分配规则（负载均衡 + 专长匹配）
INSERT OR IGNORE INTO assignment_rules (id, rule_type, priority, config_json) VALUES
('rule-001', 'skill_match', 1, '{"description": "优先匹配专长服务类型"}'),
('rule-002', 'load_balance', 2, '{"description": "按当前线索数负载均衡"}');
