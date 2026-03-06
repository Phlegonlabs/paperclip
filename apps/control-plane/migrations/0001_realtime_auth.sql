CREATE TABLE IF NOT EXISTS realtime_users (
  id TEXT PRIMARY KEY,
  email TEXT,
  name TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS realtime_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS realtime_instance_user_roles (
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, role)
);

CREATE TABLE IF NOT EXISTS realtime_company_memberships (
  company_id TEXT NOT NULL,
  principal_type TEXT NOT NULL,
  principal_id TEXT NOT NULL,
  status TEXT NOT NULL,
  membership_role TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (company_id, principal_type, principal_id)
);

CREATE INDEX IF NOT EXISTS idx_realtime_company_memberships_principal
  ON realtime_company_memberships (principal_type, principal_id, status);

CREATE TABLE IF NOT EXISTS realtime_agent_api_keys (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  revoked_at TEXT,
  last_used_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_realtime_agent_api_keys_company
  ON realtime_agent_api_keys (company_id, agent_id);
