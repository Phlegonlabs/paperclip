import { symmetricEncodeJWT } from "better-auth/crypto";
import type { ControlPlaneEnv } from "./env";
import { handleRequest } from "./app";
import {
  HEALTH_PATH,
  INTERNAL_BOARD_ACCESS_SYNC_PATH,
  INTERNAL_LIVE_EVENT_PUBLISH_PATH,
  matchCompanyRealtimePath,
} from "./routes";

type DurableObjectFetchRecord = {
  companyId: string | null;
  fetchCount: number;
  requests: Request[];
};

type MembershipRecord = {
  companyId: string;
  status: string;
  membershipRole: string | null;
};

type AgentKeyRecord = {
  id: string;
  agent_id: string;
  company_id: string;
  key_hash: string;
  revoked_at: string | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
};

class FakeD1Statement implements D1PreparedStatement {
  private values: unknown[] = [];

  constructor(
    private readonly db: FakeD1Database,
    private readonly sql: string,
  ) {}

  bind(...values: unknown[]): D1PreparedStatement {
    this.values = values;
    return this;
  }

  async first<T = Record<string, unknown>>(_columnName?: string): Promise<T | null> {
    if (this.sql.startsWith("SELECT id, agent_id, company_id, revoked_at FROM realtime_agent_api_keys")) {
      const keyHash = String(this.values[0] ?? "");
      return (this.db.agentKeysByHash.get(keyHash) ?? null) as T | null;
    }
    return null;
  }

  async run<T = Record<string, unknown>>(): Promise<D1Result<T>> {
    if (this.sql.startsWith("UPDATE realtime_agent_api_keys SET last_used_at")) {
      const lastUsedAt = String(this.values[0] ?? "");
      const updatedAt = String(this.values[1] ?? "");
      const keyId = String(this.values[2] ?? "");
      for (const entry of this.db.agentKeysByHash.values()) {
        if (entry.id !== keyId) continue;
        entry.last_used_at = lastUsedAt;
        entry.updated_at = updatedAt;
      }
      return { success: true, results: [] };
    }

    if (this.sql.startsWith("INSERT INTO realtime_users")) {
      const [id, email, name, updatedAt] = this.values.map((value) =>
        value === null || value === undefined ? null : String(value),
      );
      this.db.users.set(String(id), {
        id: String(id),
        email,
        name,
        updatedAt: String(updatedAt),
      });
      return { success: true, results: [] };
    }

    if (this.sql.startsWith("INSERT INTO realtime_sessions")) {
      const [id, userId, expiresAt, updatedAt] = this.values.map((value) => String(value ?? ""));
      this.db.sessions.set(id, { id, userId, expiresAt, updatedAt });
      return { success: true, results: [] };
    }

    if (this.sql.startsWith("DELETE FROM realtime_instance_user_roles")) {
      this.db.rolesByUser.delete(String(this.values[0] ?? ""));
      return { success: true, results: [] };
    }

    if (this.sql.startsWith("INSERT INTO realtime_instance_user_roles")) {
      const userId = String(this.values[0] ?? "");
      const role = String(this.values[1] ?? "");
      const roles = this.db.rolesByUser.get(userId) ?? [];
      roles.push(role);
      this.db.rolesByUser.set(userId, roles);
      return { success: true, results: [] };
    }

    if (this.sql.startsWith("DELETE FROM realtime_company_memberships")) {
      this.db.membershipsByUser.delete(String(this.values[0] ?? ""));
      return { success: true, results: [] };
    }

    if (this.sql.startsWith("INSERT INTO realtime_company_memberships")) {
      const [companyId, userId, status, membershipRole] = this.values;
      const memberships = this.db.membershipsByUser.get(String(userId)) ?? [];
      memberships.push({
        companyId: String(companyId),
        status: String(status),
        membershipRole: membershipRole === null ? null : String(membershipRole ?? ""),
      });
      this.db.membershipsByUser.set(String(userId), memberships);
      return { success: true, results: [] };
    }

    if (this.sql.startsWith("INSERT INTO realtime_agent_api_keys")) {
      const [id, agentId, companyId, keyHash, revokedAt, lastUsedAt, createdAt, updatedAt] = this.values;
      this.db.agentKeysByHash.set(String(keyHash), {
        id: String(id),
        agent_id: String(agentId),
        company_id: String(companyId),
        key_hash: String(keyHash),
        revoked_at: revokedAt === null ? null : String(revokedAt ?? ""),
        last_used_at: lastUsedAt === null ? null : String(lastUsedAt ?? ""),
        created_at: String(createdAt),
        updated_at: String(updatedAt),
      });
      return { success: true, results: [] };
    }

    return { success: true, results: [] };
  }

  async all<T = Record<string, unknown>>(): Promise<D1Result<T>> {
    if (this.sql.startsWith("SELECT role FROM realtime_instance_user_roles")) {
      const userId = String(this.values[0] ?? "");
      return {
        success: true,
        results: (this.db.rolesByUser.get(userId) ?? []).map((role) => ({ role })) as T[],
      };
    }

    if (this.sql.startsWith("SELECT company_id FROM realtime_company_memberships")) {
      const userId = String(this.values[0] ?? "");
      return {
        success: true,
        results: (this.db.membershipsByUser.get(userId) ?? [])
          .filter((row) => row.status === "active")
          .map((row) => ({ company_id: row.companyId })) as T[],
      };
    }

    return { success: true, results: [] };
  }
}

class FakeD1Database implements D1Database {
  readonly users = new Map<string, { id: string; email: string | null; name: string | null; updatedAt: string }>();
  readonly sessions = new Map<string, { id: string; userId: string; expiresAt: string; updatedAt: string }>();
  readonly rolesByUser = new Map<string, string[]>();
  readonly membershipsByUser = new Map<string, MembershipRecord[]>();
  readonly agentKeysByHash = new Map<string, AgentKeyRecord>();

  prepare(query: string): D1PreparedStatement {
    return new FakeD1Statement(this, query.replace(/\s+/g, " ").trim());
  }

  async exec(_query: string): Promise<D1Result> {
    return { success: true, results: [] };
  }
}

async function createBoardCookie(secret: string, userId: string, sessionId = "sess-1") {
  const token = await symmetricEncodeJWT(
    {
      session: {
        id: sessionId,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
        token: "session-token",
      },
      user: {
        id: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        email: `${userId}@example.com`,
        emailVerified: true,
        name: userId,
      },
      updatedAt: Date.now(),
      version: "1",
    },
    secret,
    "better-auth-session",
    300,
  );

  return `__Secure-better-auth.session_data=${token}`;
}

function createEnv(record: DurableObjectFetchRecord, db: FakeD1Database): ControlPlaneEnv {
  return {
    CONTROL_PLANE_ENV: "test",
    CONTROL_PLANE_INTERNAL_TOKEN: "internal-token",
    BETTER_AUTH_SECRET: "test-auth-secret",
    AUTH_DB: db,
    ASSETS: {
      async fetch(input) {
        const rawUrl =
          typeof input === "string"
            ? input
            : input instanceof Request
              ? input.url
              : input.toString();
        const url = new URL(rawUrl);
        if (url.pathname === "/index.html") {
          return new Response("<html>fallback</html>", {
            status: 200,
            headers: {
              "content-type": "text/html; charset=utf-8",
            },
          });
        }

        return new Response("asset-miss", { status: 404 });
      },
    },
    COMPANY_REALTIME: {
      idFromName(name) {
        record.companyId = String(name);
        return name;
      },
      get() {
        return {
          async fetch(input) {
            record.fetchCount += 1;
            record.requests.push(input instanceof Request ? input : new Request(input));
            return new Response("realtime-ok");
          },
        };
      },
    },
  };
}

describe("handleRequest", () => {
  it("returns the health payload on /api/health", async () => {
    const db = new FakeD1Database();
    const record: DurableObjectFetchRecord = { companyId: null, fetchCount: 0, requests: [] };
    const response = await handleRequest(
      new Request(`https://control-plane.test${HEALTH_PATH}`),
      createEnv(record, db),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "ok",
      service: "control-plane",
      routing: {
        assets: "same-origin",
        health: "/api/health",
        realtime: "/api/companies/:companyId/events/ws",
      },
    });
  });

  it("rejects websocket requests without board or agent auth", async () => {
    const db = new FakeD1Database();
    const record: DurableObjectFetchRecord = { companyId: null, fetchCount: 0, requests: [] };
    const response = await handleRequest(
      new Request("https://control-plane.test/api/companies/acme/events/ws", {
        headers: {
          Upgrade: "websocket",
        },
      }),
      createEnv(record, db),
    );

    expect(response.status).toBe(401);
    expect(record.fetchCount).toBe(0);
  });

  it("syncs board access snapshots and then authorizes websocket requests", async () => {
    const db = new FakeD1Database();
    const record: DurableObjectFetchRecord = { companyId: null, fetchCount: 0, requests: [] };
    const env = createEnv(record, db);

    const syncResponse = await handleRequest(
      new Request(`https://control-plane.test${INTERNAL_BOARD_ACCESS_SYNC_PATH}?userId=user-1`, {
        method: "POST",
        headers: {
          authorization: "Bearer internal-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          user: {
            id: "user-1",
            email: "user-1@example.com",
            name: "User 1",
            updatedAt: new Date().toISOString(),
          },
          session: null,
          roles: [],
          companyMemberships: [
            {
              companyId: "acme",
              status: "active",
              membershipRole: "member",
            },
          ],
        }),
      }),
      env,
    );
    expect(syncResponse.status).toBe(200);

    const cookie = await createBoardCookie(env.BETTER_AUTH_SECRET ?? "", "user-1");
    const response = await handleRequest(
      new Request("https://control-plane.test/api/companies/acme/events/ws", {
        headers: {
          Upgrade: "websocket",
          Cookie: cookie,
        },
      }),
      env,
    );

    expect(response.status).toBe(200);
    expect(record.companyId).toBe("acme");
    expect(record.fetchCount).toBe(1);
    expect(record.requests[0]!.headers.get("cookie")).toBeNull();
    expect(record.requests[0]!.headers.get("x-paperclip-company-id")).toBe("acme");
    expect(record.requests[0]!.headers.get("x-paperclip-signature")).toBeTruthy();
  });

  it("forwards internal live events without rewriting their wire contract", async () => {
    const db = new FakeD1Database();
    const record: DurableObjectFetchRecord = { companyId: null, fetchCount: 0, requests: [] };
    const env = createEnv(record, db);
    const event = {
      id: 42,
      companyId: "acme",
      type: "activity.logged",
      createdAt: new Date().toISOString(),
      payload: {
        action: "issue.updated",
      },
    };

    const response = await handleRequest(
      new Request(`https://control-plane.test${INTERNAL_LIVE_EVENT_PUBLISH_PATH}`, {
        method: "POST",
        headers: {
          authorization: "Bearer internal-token",
          "content-type": "application/json",
        },
        body: JSON.stringify(event),
      }),
      env,
    );

    expect(response.status).toBe(200);
    expect(record.fetchCount).toBe(1);
    await expect(record.requests[0]!.json()).resolves.toEqual(event);
  });

  it("falls back to index.html only for navigation requests", async () => {
    const db = new FakeD1Database();
    const record: DurableObjectFetchRecord = { companyId: null, fetchCount: 0, requests: [] };
    const response = await handleRequest(
      new Request("https://control-plane.test/companies/acme/tasks", {
        headers: {
          accept: "text/html,application/xhtml+xml",
        },
      }),
      createEnv(record, db),
    );

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toContain("fallback");
  });

  it("returns the original 404 for missing static assets", async () => {
    const db = new FakeD1Database();
    const record: DurableObjectFetchRecord = { companyId: null, fetchCount: 0, requests: [] };
    const response = await handleRequest(
      new Request("https://control-plane.test/assets/app.js", {
        headers: {
          accept: "application/javascript",
        },
      }),
      createEnv(record, db),
    );

    expect(response.status).toBe(404);
    await expect(response.text()).resolves.toBe("asset-miss");
  });
});

describe("matchCompanyRealtimePath", () => {
  it("extracts the company id from the realtime route", () => {
    expect(matchCompanyRealtimePath("/api/companies/acme/events/ws")).toBe("acme");
  });

  it("returns null for non-realtime routes", () => {
    expect(matchCompanyRealtimePath("/api/health")).toBeNull();
  });
});
