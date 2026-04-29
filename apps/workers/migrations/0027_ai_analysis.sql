-- AI 提示词配置表
CREATE TABLE IF NOT EXISTS ai_prompts (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  system_prompt TEXT NOT NULL DEFAULT '',
  user_prompt_template TEXT NOT NULL DEFAULT '',
  model_id TEXT REFERENCES ai_models(id) ON DELETE SET NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- AI 分析历史表（线索/客户共用）
CREATE TABLE IF NOT EXISTS ai_analyses (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK(entity_type IN ('lead', 'client')),
  entity_id TEXT NOT NULL,
  prompt_key TEXT NOT NULL,
  model_display_name TEXT,
  summary TEXT,
  analysis TEXT,
  actions_json TEXT,
  executed_actions_json TEXT DEFAULT '[]',
  triggered_by TEXT DEFAULT 'manual',
  created_by_user_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_analyses_entity ON ai_analyses(entity_type, entity_id);

-- 默认线索分析提示词
INSERT OR IGNORE INTO ai_prompts (id, key, name, system_prompt, user_prompt_template) VALUES (
  'builtin-lead-analysis',
  'lead_analysis',
  '线索分析',
  '你是一位专业的医疗辅助生殖行业 CRM 分析助手。基于线索信息和历史跟进记录，分析客户意向强度、判断当前跟进阶段、识别潜在风险，并给出具体可执行的跟进建议。只输出 JSON，不要包含任何其他文字。',
  '当前日期：{{today}}

线索信息：
- 姓名：{{name}}
- 来源：{{source}}
- 当前状态：{{status}}
- 意向服务：{{intended_services}}
- 下次联系时间：{{next_contact_date}}
- 负责销售：{{assigned_to_name}}

历史跟进记录（最近20条）：
{{activities}}

可用跟进类型：{{activity_types}}

请以如下 JSON 格式输出（只输出 JSON，不要有其他文字）：
{
  "summary": "一句话概括当前情况（20字以内）",
  "analysis": "详细分析，包含意向强度判断、沟通进展评估、潜在风险提示（200字以内）",
  "actions": [
    {
      "type": "操作类型",
      "label": "按钮显示文字（10字以内）",
      "value": "操作值",
      "reason": "建议理由（30字以内）"
    }
  ]
}

支持的操作类型（actions 最多3个，只列真正有价值的）：
- set_next_contact_date：设置下次联系时间，value 为 YYYY-MM-DD 格式日期
- update_lead_status：更新线索状态，value 为 New/Contacted/Qualified/Lost 之一
- update_intended_services：更新意向服务，value 为 JSON 数组字符串，如 ["代孕服务","试管婴儿"]
- create_activity：建议创建跟进记录，value 为 {"activityType":"跟进类型名称","description":"建议内容","date":"YYYY-MM-DD"}'
);

-- 默认客户分析提示词
INSERT OR IGNORE INTO ai_prompts (id, key, name, system_prompt, user_prompt_template) VALUES (
  'builtin-client-analysis',
  'client_analysis',
  '客户分析',
  '你是一位专业的医疗辅助生殖行业 CRM 分析助手。基于客户信息和历史跟进记录，分析客户当前服务阶段、满意度、潜在风险，并给出具体可执行的跟进建议。只输出 JSON，不要包含任何其他文字。',
  '当前日期：{{today}}

客户信息：
- 姓名：{{name}}
- 合同状态：{{contract_status}}
- 服务套餐：{{service_plans}}
- 下次联系时间：{{next_contact_date}}
- 负责销售：{{assigned_sales_name}}

历史跟进记录（最近20条）：
{{activities}}

可用跟进类型：{{activity_types}}

请以如下 JSON 格式输出（只输出 JSON，不要有其他文字）：
{
  "summary": "一句话概括当前情况（20字以内）",
  "analysis": "详细分析，包含服务进展、客户满意度判断、潜在风险提示（200字以内）",
  "actions": [
    {
      "type": "操作类型",
      "label": "按钮显示文字（10字以内）",
      "value": "操作值",
      "reason": "建议理由（30字以内）"
    }
  ]
}

支持的操作类型（actions 最多3个，只列真正有价值的）：
- set_next_contact_date：设置下次联系时间，value 为 YYYY-MM-DD 格式日期
- update_contract_status：更新合同状态，value 为合同状态值（如：签约中、已签约、已完成）
- update_service_plans：更新服务套餐，value 为 JSON 数组字符串，如 ["代孕服务"]
- create_activity：建议创建跟进记录，value 为 {"activityType":"跟进类型名称","description":"建议内容","date":"YYYY-MM-DD"}'
);
