-- 跟进记录附件表
CREATE TABLE IF NOT EXISTS activity_attachments (
  id            TEXT     PRIMARY KEY NOT NULL,
  activity_id   TEXT     NOT NULL,
  r2_object_key TEXT     NOT NULL,
  file_name     TEXT     NOT NULL,
  file_size     INTEGER  NOT NULL DEFAULT 0,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (activity_id) REFERENCES sales_activities(id)
);
CREATE INDEX IF NOT EXISTS idx_act_attach ON activity_attachments(activity_id);
