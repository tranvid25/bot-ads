ALTER TABLE facebook_discovery_jobs ADD COLUMN kind TEXT NOT NULL DEFAULT 'discover';
ALTER TABLE facebook_groups ADD COLUMN membership_note TEXT NOT NULL DEFAULT '';
ALTER TABLE facebook_groups ADD COLUMN membership_account_key TEXT NOT NULL DEFAULT '';
CREATE TABLE facebook_membership_results (
 task_id TEXT NOT NULL REFERENCES facebook_discovery_jobs(id),
 group_id TEXT NOT NULL REFERENCES facebook_groups(id),
 status TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', updated_at INTEGER NOT NULL,
 PRIMARY KEY(task_id,group_id)
);
CREATE INDEX facebook_membership_group ON facebook_membership_results(group_id,updated_at DESC);
