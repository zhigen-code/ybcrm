-- AI 模型提供商配置
CREATE TABLE IF NOT EXISTS ai_providers (
  id           TEXT    PRIMARY KEY NOT NULL,
  name         TEXT    NOT NULL,
  provider_type TEXT   NOT NULL DEFAULT 'openai',  -- openai | anthropic | custom
  api_key      TEXT    NOT NULL,
  base_url     TEXT,                                -- OpenAI 兼容接口自定义地址
  is_active    INTEGER NOT NULL DEFAULT 1,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 已启用的 AI 模型
CREATE TABLE IF NOT EXISTS ai_models (
  id           TEXT    PRIMARY KEY NOT NULL,
  provider_id  TEXT    NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
  model_id     TEXT    NOT NULL,   -- API 中的模型 ID，如 gpt-4o
  display_name TEXT    NOT NULL,   -- 展示名称
  is_enabled   INTEGER NOT NULL DEFAULT 1,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider_id, model_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_models_provider ON ai_models(provider_id);
