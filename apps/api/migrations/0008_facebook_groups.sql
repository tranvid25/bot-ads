CREATE TABLE facebook_discovery_jobs (
 id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
 config TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'queued', device_id TEXT,
 account_key TEXT, lease_until INTEGER, cancel_requested INTEGER NOT NULL DEFAULT 0,
 report_seq INTEGER NOT NULL DEFAULT 0, groups_seen INTEGER NOT NULL DEFAULT 0,
 error TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
 deadline INTEGER NOT NULL
);
CREATE UNIQUE INDEX facebook_discovery_active ON facebook_discovery_jobs(workspace_id) WHERE status IN ('queued','running');
CREATE TABLE facebook_groups (
 id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
 account_key TEXT NOT NULL, url TEXT NOT NULL, name TEXT NOT NULL,
 source TEXT NOT NULL, membership TEXT NOT NULL DEFAULT 'unknown',
 eligibility TEXT NOT NULL DEFAULT 'unreviewed', reason TEXT NOT NULL DEFAULT '',
 checked_at INTEGER NOT NULL, reviewed_at INTEGER, created_at INTEGER NOT NULL,
 UNIQUE(workspace_id,account_key,url)
);
CREATE INDEX facebook_groups_owner ON facebook_groups(workspace_id,checked_at);
ALTER TABLE devices ADD COLUMN discovery_supported INTEGER NOT NULL DEFAULT 0;
