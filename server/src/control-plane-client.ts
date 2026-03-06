import { and, eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import {
  agentApiKeys,
  authSessions,
  authUsers,
  companyMemberships,
  instanceUserRoles,
} from "@paperclipai/db";
import type { LiveEvent } from "@paperclipai/shared";

type InternalConfig = {
  baseUrl: string;
  token: string;
};

function getInternalConfig(): InternalConfig | null {
  const baseUrl = process.env.PAPERCLIP_CONTROL_PLANE_URL?.trim();
  const token = process.env.PAPERCLIP_CONTROL_PLANE_INTERNAL_TOKEN?.trim();
  if (!baseUrl || !token) return null;
  return { baseUrl, token };
}

function toIsoString(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

async function postInternalJson(pathname: string, body: unknown): Promise<void> {
  const config = getInternalConfig();
  if (!config) return;

  const response = await fetch(new URL(pathname, config.baseUrl), {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.token}`,
      "content-type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`Control plane request failed (${response.status}): ${message || response.statusText}`);
  }
}

async function buildBoardAccessPayload(
  db: Db,
  userId: string,
  sessionId?: string | null,
) {
  const [user, session, roles, memberships] = await Promise.all([
    db
      .select()
      .from(authUsers)
      .where(eq(authUsers.id, userId))
      .then((rows) => rows[0] ?? null),
    sessionId
      ? db
        .select()
        .from(authSessions)
        .where(and(eq(authSessions.id, sessionId), eq(authSessions.userId, userId)))
        .then((rows) => rows[0] ?? null)
      : Promise.resolve(null),
    db
      .select({ role: instanceUserRoles.role })
      .from(instanceUserRoles)
      .where(eq(instanceUserRoles.userId, userId)),
    db
      .select({
        companyId: companyMemberships.companyId,
        status: companyMemberships.status,
        membershipRole: companyMemberships.membershipRole,
      })
      .from(companyMemberships)
      .where(
        and(
          eq(companyMemberships.principalType, "user"),
          eq(companyMemberships.principalId, userId),
        ),
      ),
  ]);

  return {
    user: user
      ? {
        id: user.id,
        email: user.email,
        name: user.name,
        updatedAt: user.updatedAt.toISOString(),
      }
      : null,
    session: session
      ? {
        id: session.id,
        userId: session.userId,
        expiresAt: session.expiresAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
      }
      : null,
    roles: roles.map((row) => row.role),
    companyMemberships: memberships.map((row) => ({
      companyId: row.companyId,
      status: row.status,
      membershipRole: row.membershipRole,
    })),
  };
}

export async function syncBoardAccessSnapshot(
  db: Db,
  input: { userId: string; sessionId?: string | null },
): Promise<void> {
  const payload = await buildBoardAccessPayload(db, input.userId, input.sessionId ?? null);
  const query = new URLSearchParams({ userId: input.userId });
  await postInternalJson(`/internal/realtime/sync/board-access?${query.toString()}`, payload);
}

export async function syncUserAccessSnapshot(db: Db, userId: string): Promise<void> {
  await syncBoardAccessSnapshot(db, { userId });
}

export async function syncAgentApiKeySnapshot(
  key: typeof agentApiKeys.$inferSelect,
): Promise<void> {
  await postInternalJson("/internal/realtime/sync/agent-key", {
    key: {
      id: key.id,
      agentId: key.agentId,
      companyId: key.companyId,
      keyHash: key.keyHash,
      createdAt: key.createdAt.toISOString(),
      revokedAt: toIsoString(key.revokedAt),
      lastUsedAt: toIsoString(key.lastUsedAt),
      updatedAt: toIsoString(key.lastUsedAt ?? key.revokedAt ?? key.createdAt) ?? key.createdAt.toISOString(),
    },
  });
}

export async function publishLiveEventToControlPlane(event: LiveEvent): Promise<void> {
  await postInternalJson("/internal/realtime/publish", event);
}
