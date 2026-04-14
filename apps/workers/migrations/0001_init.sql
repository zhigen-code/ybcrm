-- 内部 CRM 用户表
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'operations', 'sales')),
    team_id TEXT,
    capacity INTEGER DEFAULT 10,
    specialization TEXT DEFAULT '[]', -- JSON array
    current_leads_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- 团队表
CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT UNIQUE NOT NULL,
    region TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 线索表
CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY NOT NULL,
    source TEXT NOT NULL,
    name TEXT NOT NULL,
    contact_info TEXT NOT NULL,
    intended_service TEXT NOT NULL CHECK(intended_service IN ('赴美试管', '代孕', '供精', '供卵')),
    status TEXT NOT NULL DEFAULT 'New' CHECK(status IN ('New', 'Contacted', 'Qualified', 'Converted', 'Lost')),
    notes TEXT,
    assigned_to_userId TEXT,
    assigned_to_teamId TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_to_userId) REFERENCES users(id),
    FOREIGN KEY (assigned_to_teamId) REFERENCES teams(id)
);

-- 客户表（由线索转化而来）
CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY NOT NULL,
    lead_id TEXT UNIQUE,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    detailed_profile TEXT DEFAULT '{}', -- JSON
    service_plan TEXT,
    contract_status TEXT,
    assigned_sales_userId TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id),
    FOREIGN KEY (assigned_sales_userId) REFERENCES users(id)
);

-- 服务表
CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    price REAL,
    process_steps TEXT DEFAULT '[]', -- JSON array
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 合作伙伴表
CREATE TABLE IF NOT EXISTS partners (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('FertilityCenter', 'SurrogacyAgency', 'EggDonationAgency')),
    contact_person TEXT,
    contact_info TEXT,
    service_scope TEXT DEFAULT '[]', -- JSON array
    api_config TEXT, -- JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 销售活动表
CREATE TABLE IF NOT EXISTS sales_activities (
    id TEXT PRIMARY KEY NOT NULL,
    client_id TEXT,
    lead_id TEXT,
    user_id TEXT NOT NULL,
    activity_type TEXT NOT NULL CHECK(activity_type IN ('Call', 'Meeting', 'Email', 'Note')),
    description TEXT,
    activity_date DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (lead_id) REFERENCES leads(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 客户门户用户表
CREATE TABLE IF NOT EXISTS client_users (
    id TEXT PRIMARY KEY NOT NULL,
    client_id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    magic_link_token TEXT,
    magic_link_expires_at DATETIME,
    last_login_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- 客户资源表
CREATE TABLE IF NOT EXISTS client_resources (
    id TEXT PRIMARY KEY NOT NULL,
    client_id TEXT NOT NULL,
    resource_type TEXT NOT NULL CHECK(resource_type IN ('MedicalReport', 'Contract', 'PassportCopy', 'PartnerContact')),
    title TEXT NOT NULL,
    description TEXT,
    r2_object_key TEXT,
    external_url TEXT,
    uploaded_by_userId TEXT,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (uploaded_by_userId) REFERENCES users(id)
);

-- 线索分配规则表
CREATE TABLE IF NOT EXISTS assignment_rules (
    id TEXT PRIMARY KEY NOT NULL,
    rule_type TEXT NOT NULL CHECK(rule_type IN ('round_robin', 'load_balance', 'skill_match', 'region_match')),
    priority INTEGER NOT NULL DEFAULT 0,
    config_json TEXT DEFAULT '{}',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_user ON leads(assigned_to_userId);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_team ON leads(assigned_to_teamId);
CREATE INDEX IF NOT EXISTS idx_clients_assigned_sales ON clients(assigned_sales_userId);
CREATE INDEX IF NOT EXISTS idx_sales_activities_client ON sales_activities(client_id);
CREATE INDEX IF NOT EXISTS idx_sales_activities_lead ON sales_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_client_resources_client ON client_resources(client_id);
CREATE INDEX IF NOT EXISTS idx_client_users_email ON client_users(email);
CREATE INDEX IF NOT EXISTS idx_client_users_magic_token ON client_users(magic_link_token);
