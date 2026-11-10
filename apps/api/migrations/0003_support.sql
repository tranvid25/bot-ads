CREATE TABLE support_requests (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id),
  requester_name TEXT NOT NULL,
  reply_email TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('support','privacy','deletion')),
  message TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','processing','completed','rejected')),
  created_at INTEGER NOT NULL,
  closed_at INTEGER
);
CREATE INDEX support_request_owner ON support_requests(workspace_id,created_at);
CREATE INDEX support_request_queue ON support_requests(status,created_at);
