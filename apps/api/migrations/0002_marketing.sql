CREATE TABLE marketing_brands (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  name TEXT NOT NULL, website TEXT NOT NULL, audience TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL DEFAULT 'en', cta_url TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL
);
CREATE INDEX marketing_brand_owner ON marketing_brands(workspace_id);
CREATE TABLE marketing_channels (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  brand_id TEXT NOT NULL REFERENCES marketing_brands(id), provider TEXT NOT NULL,
  actor_id TEXT NOT NULL, name TEXT NOT NULL, credential TEXT, scopes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'connected', expires_at INTEGER, created_at INTEGER NOT NULL,
  UNIQUE(workspace_id,brand_id,provider,actor_id)
);
CREATE INDEX marketing_channel_owner ON marketing_channels(workspace_id);
CREATE TABLE marketing_oauth_states (
  state_hash TEXT PRIMARY KEY, browser_hash TEXT NOT NULL, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  brand_id TEXT NOT NULL REFERENCES marketing_brands(id), redirect_uri TEXT NOT NULL, expires_at INTEGER NOT NULL
);
CREATE TABLE marketing_posts (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  brand_id TEXT NOT NULL REFERENCES marketing_brands(id), title TEXT NOT NULL,
  source_url TEXT NOT NULL DEFAULT '', variants TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL DEFAULT 'draft',
  approved_at INTEGER, updated_at INTEGER NOT NULL
);
CREATE INDEX marketing_post_owner ON marketing_posts(workspace_id,updated_at);
CREATE TABLE marketing_publications (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  post_id TEXT NOT NULL REFERENCES marketing_posts(id), channel_id TEXT NOT NULL REFERENCES marketing_channels(id),
  revision INTEGER NOT NULL, snapshot TEXT NOT NULL, scheduled_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled', attempt_count INTEGER NOT NULL DEFAULT 0,
  claim_token TEXT, lease_until INTEGER, submit_started_at INTEGER, quota_day TEXT, remote_id TEXT, permalink TEXT,
  error TEXT, cancel_requested INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
  UNIQUE(post_id,revision,channel_id,scheduled_at)
);
CREATE INDEX marketing_due ON marketing_publications(status,scheduled_at);
CREATE INDEX marketing_publication_owner ON marketing_publications(workspace_id,created_at);
CREATE UNIQUE INDEX marketing_one_publishing_account ON marketing_publications(channel_id) WHERE status='publishing';
CREATE UNIQUE INDEX marketing_one_unresolved_post ON marketing_publications(post_id,revision,channel_id) WHERE status IN ('scheduled','retry_wait','publishing','unknown','needs_reauth','awaiting_manual');
CREATE TABLE marketing_attempts (
  id TEXT PRIMARY KEY, publication_id TEXT NOT NULL REFERENCES marketing_publications(id),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id), claim_token TEXT NOT NULL,
  status TEXT NOT NULL, message TEXT, created_at INTEGER NOT NULL
);
CREATE INDEX marketing_attempt_owner ON marketing_attempts(workspace_id,created_at);
CREATE TABLE marketing_public_media (
  id TEXT PRIMARY KEY, publication_id TEXT NOT NULL UNIQUE REFERENCES marketing_publications(id),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id), object_key TEXT NOT NULL,
  mime TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE marketing_account_slots (
  provider TEXT NOT NULL, actor_id TEXT NOT NULL, owner_token TEXT NOT NULL,
  until_at INTEGER NOT NULL, PRIMARY KEY(provider,actor_id)
);
CREATE TABLE marketing_metrics (
  publication_id TEXT PRIMARY KEY REFERENCES marketing_publications(id), workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  visits INTEGER NOT NULL DEFAULT 0, leads INTEGER NOT NULL DEFAULT 0, note TEXT NOT NULL DEFAULT '', updated_at INTEGER NOT NULL
);
