-- 通用附件表：供服务、合作伙伴等实体复用
CREATE TABLE IF NOT EXISTS entity_attachments (
  id           TEXT    PRIMARY KEY NOT NULL,
  entity_type  TEXT    NOT NULL,   -- 'service' | 'partner'
  entity_id    TEXT    NOT NULL,
  name         TEXT    NOT NULL,   -- 原始文件名
  file_key     TEXT    NOT NULL,   -- R2 存储 key
  size         INTEGER,            -- 字节数
  mime_type    TEXT,
  uploaded_by  TEXT REFERENCES users(id),
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_entity_attachments
  ON entity_attachments(entity_type, entity_id);
