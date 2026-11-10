CREATE TABLE google_auth_states (
  state_hash TEXT PRIMARY KEY,
  browser_hash TEXT NOT NULL,
  nonce_hash TEXT NOT NULL,
  verifier TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  user_id TEXT REFERENCES users(id),
  session_hash TEXT,
  expires_at INTEGER NOT NULL
);
CREATE INDEX google_auth_expiry ON google_auth_states(expires_at);
CREATE TABLE auth_identities (
  provider TEXT NOT NULL,
  subject TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  email TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY(provider,subject),
  UNIQUE(provider,user_id)
);
CREATE INDEX auth_identity_user ON auth_identities(user_id);
