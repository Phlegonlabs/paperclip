type RealtimeUserRecord = {
  id: string;
  email: string | null;
  name: string | null;
  updatedAt: string;
};

type RealtimeSessionRecord = {
  id: string;
  userId: string;
  expiresAt: string;
  updatedAt: string;
};

export type BoardAccessSyncPayload = {
  user: RealtimeUserRecord | null;
  session: RealtimeSessionRecord | null;
  roles: string[];
  companyMemberships: Array<{
    companyId: string;
    status: string;
    membershipRole: string | null;
  }>;
};

export type AgentKeySyncPayload = {
  key: {
    id: string;
    agentId: string;
    companyId: string;
    keyHash: string;
    createdAt: string;
    revokedAt: string | null;
    lastUsedAt: string | null;
    updatedAt: string;
  };
};

type RoleRow = {
  role: string;
};

type MembershipRow = {
  company_id: string;
};

type AgentKeyRow = {
  id: string;
  agent_id: string;
  company_id: string;
  revoked_at: string | null;
};

export async function getBoardAccessSnapshot(
  db: D1Database,
  userId: string,
): Promise<{ isInstanceAdmin: boolean; companyIds: string[] }> {
  const [roleResult, membershipResult] = await Promise.all([
    db
      .prepare(
        "SELECT role FROM realtime_instance_user_roles WHERE user_id = ?",
      )
      .bind(userId)
      .all<RoleRow>(),
    db
      .prepare(
        "SELECT company_id FROM realtime_company_memberships WHERE principal_type = 'user' AND principal_id = ? AND status = 'active'",
      )
      .bind(userId)
      .all<MembershipRow>(),
  ]);

  const roles = roleResult.results ?? [];
  const memberships = membershipResult.results ?? [];
  return {
    isInstanceAdmin: roles.some((row) => row.role === "instance_admin"),
    companyIds: memberships.map((row) => row.company_id),
  };
}

export async function findAgentKeyByHash(
  db: D1Database,
  keyHash: string,
): Promise<AgentKeyRow | null> {
  return db
    .prepare(
      "SELECT id, agent_id, company_id, revoked_at FROM realtime_agent_api_keys WHERE key_hash = ? LIMIT 1",
    )
    .bind(keyHash)
    .first<AgentKeyRow>();
}

export async function touchAgentKeyLastUsed(
  db: D1Database,
  keyId: string,
  lastUsedAt: string,
): Promise<void> {
  await db
    .prepare(
      "UPDATE realtime_agent_api_keys SET last_used_at = ?, updated_at = ? WHERE id = ?",
    )
    .bind(lastUsedAt, lastUsedAt, keyId)
    .run();
}

export async function applyBoardAccessSnapshot(
  db: D1Database,
  userId: string,
  payload: BoardAccessSyncPayload,
): Promise<void> {
  const updatedAt = new Date().toISOString();

  if (payload.user) {
    await db
      .prepare(
        "INSERT INTO realtime_users (id, email, name, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET email = excluded.email, name = excluded.name, updated_at = excluded.updated_at",
      )
      .bind(payload.user.id, payload.user.email, payload.user.name, payload.user.updatedAt)
      .run();
  }

  if (payload.session) {
    await db
      .prepare(
        "INSERT INTO realtime_sessions (id, user_id, expires_at, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET user_id = excluded.user_id, expires_at = excluded.expires_at, updated_at = excluded.updated_at",
      )
      .bind(
        payload.session.id,
        payload.session.userId,
        payload.session.expiresAt,
        payload.session.updatedAt,
      )
      .run();
  }

  await db
    .prepare("DELETE FROM realtime_instance_user_roles WHERE user_id = ?")
    .bind(userId)
    .run();
  for (const role of payload.roles) {
    await db
      .prepare(
        "INSERT INTO realtime_instance_user_roles (user_id, role, updated_at) VALUES (?, ?, ?)",
      )
      .bind(userId, role, updatedAt)
      .run();
  }

  await db
    .prepare(
      "DELETE FROM realtime_company_memberships WHERE principal_type = 'user' AND principal_id = ?",
    )
    .bind(userId)
    .run();
  for (const membership of payload.companyMemberships) {
    await db
      .prepare(
        "INSERT INTO realtime_company_memberships (company_id, principal_type, principal_id, status, membership_role, updated_at) VALUES (?, 'user', ?, ?, ?, ?)",
      )
      .bind(
        membership.companyId,
        userId,
        membership.status,
        membership.membershipRole,
        updatedAt,
      )
      .run();
  }
}

export async function applyAgentKeySnapshot(
  db: D1Database,
  payload: AgentKeySyncPayload,
): Promise<void> {
  const { key } = payload;
  await db
    .prepare(
      "INSERT INTO realtime_agent_api_keys (id, agent_id, company_id, key_hash, revoked_at, last_used_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET agent_id = excluded.agent_id, company_id = excluded.company_id, key_hash = excluded.key_hash, revoked_at = excluded.revoked_at, last_used_at = excluded.last_used_at, created_at = excluded.created_at, updated_at = excluded.updated_at",
    )
    .bind(
      key.id,
      key.agentId,
      key.companyId,
      key.keyHash,
      key.revokedAt,
      key.lastUsedAt,
      key.createdAt,
      key.updatedAt,
    )
    .run();
}
