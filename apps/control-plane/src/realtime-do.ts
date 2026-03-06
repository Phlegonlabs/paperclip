import type { LiveEvent } from "@paperclipai/shared";
import type { ControlPlaneEnv } from "./env";
import { json } from "./http";
import { verifySignedRealtimeRequest, isLiveEvent } from "./realtime-contract";
import { matchCompanyRealtimePath } from "./routes";

type WebSocketUpgradeResponseInit = ResponseInit & {
  webSocket: WebSocket;
};

export class CompanyRealtimeHub {
  constructor(
    private readonly state: DurableObjectState,
    private readonly env: ControlPlaneEnv,
  ) {}

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("upgrade")?.toLowerCase() === "websocket") {
      return this.handleWebSocketUpgrade(request);
    }

    if (request.method === "POST") {
      return this.handleInternalPublish(request);
    }

    return json(
      {
        error: "WebSocket upgrade required",
      },
      { status: 426 },
    );
  }

  private async handleWebSocketUpgrade(request: Request): Promise<Response> {
    const signed = await verifySignedRealtimeRequest(request, this.env, "ws-upgrade");
    if (!signed) {
      return json(
        {
          error: "Forbidden realtime upgrade",
        },
        { status: 403 },
      );
    }

    const companyId = this.resolveCompanyId(request);
    if (companyId !== signed.companyId) {
      return json({ error: "Company mismatch" }, { status: 403 });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    this.state.acceptWebSocket(server);

    const responseInit: WebSocketUpgradeResponseInit = {
      status: 101,
      webSocket: client,
    };

    return new Response(null, responseInit as ResponseInit);
  }

  private async handleInternalPublish(request: Request): Promise<Response> {
    const signed = await verifySignedRealtimeRequest(request, this.env, "publish-live-event");
    if (!signed) {
      return json({ error: "Forbidden live event publish" }, { status: 403 });
    }

    const event = await request.json().catch(() => null);
    if (!isLiveEvent(event)) {
      return json({ error: "Invalid live event payload" }, { status: 400 });
    }
    if (event.companyId !== signed.companyId) {
      return json({ error: "Company mismatch" }, { status: 403 });
    }

    this.broadcastEvent(event);
    return json({ ok: true, deliveredTo: this.state.getWebSockets().length });
  }

  webSocketMessage(socket: WebSocket): void {
    try {
      socket.close(1008, "client messages are not accepted");
    } catch {
      // Ignore follow-up close errors.
    }
  }

  webSocketClose(): void {}

  webSocketError(socket: WebSocket): void {
    try {
      socket.close(1011, "realtime socket error");
    } catch {
      // Ignore follow-up close errors for a best-effort skeleton.
    }
  }

  private resolveCompanyId(request: Request): string {
    const pathname = new URL(request.url).pathname;
    return matchCompanyRealtimePath(pathname) ?? "unknown";
  }

  private broadcastEvent(event: LiveEvent): void {
    const wireMessage = JSON.stringify(event);
    for (const socket of this.state.getWebSockets()) {
      socket.send(wireMessage);
    }
  }
}
