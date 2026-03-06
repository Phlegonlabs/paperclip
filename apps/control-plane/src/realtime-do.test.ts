import type { LiveEvent } from "@paperclipai/shared";
import type { ControlPlaneEnv } from "./env";
import { buildSignedInternalPublishHeaders } from "./auth";
import { CompanyRealtimeHub } from "./realtime-do";

type FakeSocket = {
  sent: string[];
  closed: Array<{ code: number; reason: string }>;
  send(message: string): void;
  close(code: number, reason: string): void;
};

function createSocket(): FakeSocket {
  return {
    sent: [],
    closed: [],
    send(message: string) {
      this.sent.push(message);
    },
    close(code: number, reason: string) {
      this.closed.push({ code, reason });
    },
  };
}

function createEnv(): ControlPlaneEnv {
  return {
    CONTROL_PLANE_ENV: "test",
    CONTROL_PLANE_INTERNAL_TOKEN: "internal-token",
    BETTER_AUTH_SECRET: "test-auth-secret",
    AUTH_DB: {
      prepare(_query: string) {
        throw new Error("AUTH_DB should not be used in this test");
      },
      exec(_query: string) {
        return Promise.resolve({ success: true, results: [] });
      },
    },
    ASSETS: {
      fetch() {
        return Promise.resolve(new Response("unused"));
      },
    },
    COMPANY_REALTIME: {
      idFromName(name) {
        return name;
      },
      get() {
        return {
          fetch() {
            return Promise.resolve(new Response("unused"));
          },
        };
      },
    },
  };
}

describe("CompanyRealtimeHub", () => {
  it("rejects unsigned websocket upgrades", async () => {
    const sockets: FakeSocket[] = [];
    const hub = new CompanyRealtimeHub(
      {
        acceptWebSocket(socket) {
          sockets.push(socket as unknown as FakeSocket);
        },
        getWebSockets() {
          return sockets as unknown as WebSocket[];
        },
      },
      createEnv(),
    );

    const response = await hub.fetch(
      new Request("https://control-plane.test/api/companies/acme/events/ws", {
        headers: {
          Upgrade: "websocket",
        },
      }),
    );

    expect(response.status).toBe(403);
    expect(sockets).toHaveLength(0);
  });

  it("broadcasts canonical live events to connected sockets", async () => {
    const sockets = [createSocket(), createSocket()];
    const env = createEnv();
    const hub = new CompanyRealtimeHub(
      {
        acceptWebSocket() {},
        getWebSockets() {
          return sockets as unknown as WebSocket[];
        },
      },
      env,
    );
    const event: LiveEvent = {
      id: 7,
      companyId: "acme",
      type: "heartbeat.run.status",
      createdAt: new Date().toISOString(),
      payload: {
        runId: "run-1",
        status: "running",
      },
    };

    const headers = await buildSignedInternalPublishHeaders(env, event.companyId);
    headers.set("content-type", "application/json");
    const response = await hub.fetch(
      new Request("https://control-plane.test/api/companies/acme/events/ws", {
        method: "POST",
        headers,
        body: JSON.stringify(event),
      }),
    );

    expect(response.status).toBe(200);
    expect(sockets[0].sent).toEqual([JSON.stringify(event)]);
    expect(sockets[1].sent).toEqual([JSON.stringify(event)]);
  });

  it("closes client sockets that try to send messages upstream", () => {
    const hub = new CompanyRealtimeHub(
      {
        acceptWebSocket() {},
        getWebSockets() {
          return [];
        },
      },
      createEnv(),
    );
    const socket = createSocket();

    hub.webSocketMessage(socket as unknown as WebSocket);

    expect(socket.closed).toEqual([
      {
        code: 1008,
        reason: "client messages are not accepted",
      },
    ]);
  });
});
