CREATE INDEX IF NOT EXISTS idx_attempt_job ON attempts(workspace_id, job_id, updated_at DESC);
CREATE TABLE IF NOT EXISTS facebook_rechecks (
  attempt_id TEXT PRIMARY KEY REFERENCES attempts(id),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  device_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  updated_at INTEGER NOT NULL,
  error TEXT
);
CREATE INDEX IF NOT EXISTS idx_recheck_device ON facebook_rechecks(workspace_id, device_id, status, updated_at);
