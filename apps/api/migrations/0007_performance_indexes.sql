-- Migration 0007: Performance indexes to minimize Cloudflare D1 row reads and accelerate query latency
CREATE INDEX IF NOT EXISTS idx_marketing_publications_quota ON marketing_publications(workspace_id, quota_day);
CREATE INDEX IF NOT EXISTS idx_marketing_publications_channel ON marketing_publications(channel_id, status);
CREATE INDEX IF NOT EXISTS idx_marketing_publications_post ON marketing_publications(post_id, revision);
CREATE INDEX IF NOT EXISTS idx_marketing_posts_workspace_brand ON marketing_posts(workspace_id, brand_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_attempts_publication ON marketing_attempts(publication_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_claim_queue ON jobs(workspace_id, status, cancel_requested, created_at);

