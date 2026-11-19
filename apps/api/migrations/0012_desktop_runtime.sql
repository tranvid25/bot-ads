CREATE TABLE IF NOT EXISTS desktop_runtime (
 device_id TEXT PRIMARY KEY REFERENCES devices(id), workspace_id TEXT NOT NULL REFERENCES workspaces(id),
 phase TEXT NOT NULL, error TEXT NOT NULL DEFAULT '', updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS desktop_commands (
 id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id), device_id TEXT NOT NULL REFERENCES devices(id),
 action TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, error TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS desktop_command_pending ON desktop_commands(device_id,action) WHERE status='pending';
