ALTER TABLE devices ADD COLUMN social_supported INTEGER NOT NULL DEFAULT 0;
ALTER TABLE marketing_channels ADD COLUMN transport TEXT NOT NULL DEFAULT 'api';
ALTER TABLE marketing_channels ADD COLUMN device_id TEXT;
UPDATE marketing_channels SET transport='manual' WHERE provider IN ('medium','reddit','indiehackers','instagram','threads','facebook','substack','youtube','tiktok','mastodon');
ALTER TABLE marketing_publications ADD COLUMN transport TEXT NOT NULL DEFAULT 'api';
UPDATE marketing_publications SET transport='manual' WHERE channel_id IN (SELECT id FROM marketing_channels WHERE transport='manual');
CREATE TABLE desktop_social_tasks (
 id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
 device_id TEXT NOT NULL REFERENCES devices(id), brand_id TEXT NOT NULL REFERENCES marketing_brands(id),
 provider TEXT NOT NULL, kind TEXT NOT NULL, publication_id TEXT UNIQUE,
 config TEXT NOT NULL DEFAULT '{}', status TEXT NOT NULL DEFAULT 'queued',
 claim_token TEXT, lease_until INTEGER, deadline INTEGER NOT NULL,
 error TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX desktop_social_active ON desktop_social_tasks(workspace_id) WHERE status='running';
CREATE UNIQUE INDEX desktop_social_connect ON desktop_social_tasks(workspace_id,provider) WHERE kind='connect' AND status IN ('queued','running');
CREATE INDEX desktop_social_device ON desktop_social_tasks(device_id,status,created_at);
