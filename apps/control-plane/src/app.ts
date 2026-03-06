import type { ControlPlaneEnv, HealthPayload } from "./env";
import { json } from "./http";
import { applyAgentKeySnapshot, applyBoardAccessSnapshot, type AgentKeySyncPayload, type BoardAccessSyncPayload } from "./auth-db";
import {
  authorizeRealtimeRequest,
  buildSignedInternalPublishHeaders,
  buildSignedProxyHeaders,
  getInternalBearerToken,
} from "./auth";
import { isLiveEvent } from "./realtime-contract";
import {
  HEALTH_PATH,
  INTERNAL_AGENT_KEY_SYNC_PATH,
  INTERNAL_BOARD_ACCESS_SYNC_PATH,
  INTERNAL_LIVE_EVENT_PUBLISH_PATH,
  REALTIME_ROUTE_PATTERN,
  matchCompanyRealtimePath,
} from "./routes";

export async function handleRequest(
  request: Request,
  env: ControlPlaneEnv,
): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === HEALTH_PATH) {
    return json(createHealthPayload(env));
  }

  if (url.pathname === INTERNAL_LIVE_EVENT_PUBLISH_PATH) {
    return handleInternalLiveEventPublish(request, env);
  }

  if (url.pathname === INTERNAL_BOARD_ACCESS_SYNC_PATH) {
    return handleBoardAccessSync(request, env);
  }

  if (url.pathname === INTERNAL_AGENT_KEY_SYNC_PATH) {
    return handleAgentKeySync(request, env);
  }

  const companyId = matchCompanyRealtimePath(url.pathname);
  if (companyId) {
    return handleRealtimeRoute(request, env, companyId);
  }

  return serveSameOriginAsset(request, env);
}

function createHealthPayload(env: ControlPlaneEnv): HealthPayload {
  return {
    status: "ok",
    service: "control-plane",
    deployment: env.CONTROL_PLANE_ENV ?? "development",
    routing: {
      assets: "same-origin",
      health: HEALTH_PATH,
      realtime: REALTIME_ROUTE_PATTERN,
    },
  };
}

async function handleRealtimeRoute(
  request: Request,
  env: ControlPlaneEnv,
  companyId: string,
): Promise<Response> {
  if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
    return json(
      {
        error: "WebSocket upgrade required",
        route: REALTIME_ROUTE_PATTERN,
      },
      { status: 426 },
    );
  }

  const authorization = await authorizeRealtimeRequest(request, env, companyId);
  if (!authorization.ok) {
    return json({ error: authorization.error }, { status: authorization.status });
  }

  const durableObjectId = env.COMPANY_REALTIME.idFromName(companyId);
  const headers = new Headers(request.headers);
  headers.delete("authorization");
  headers.delete("cookie");
  const signedHeaders = await buildSignedProxyHeaders(env, authorization.actor);
  signedHeaders.forEach((value, key) => {
    headers.set(key, value);
  });

  return env.COMPANY_REALTIME.get(durableObjectId).fetch(
    new Request(request, {
      headers,
    }),
  );
}

async function serveSameOriginAsset(
  request: Request,
  env: ControlPlaneEnv,
): Promise<Response> {
  const assetResponse = await env.ASSETS.fetch(request);
  if (assetResponse.status !== 404) {
    return assetResponse;
  }

  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/")) {
    return json({ error: "Not found" }, { status: 404 });
  }

  if (!isHtmlNavigationRequest(request)) {
    return assetResponse;
  }

  return env.ASSETS.fetch(
    new Request(new URL("/index.html", url), {
      method: "GET",
      headers: request.headers,
    }),
  );
}

function isHtmlNavigationRequest(request: Request): boolean {
  if (request.method !== "GET") return false;
  const accept = request.headers.get("accept") ?? "";
  return accept.includes("text/html");
}

function assertInternalToken(request: Request, env: ControlPlaneEnv): Response | null {
  const token = getInternalBearerToken(request);
  if (!token) {
    return json({ error: "Internal bearer token required" }, { status: 401 });
  }
  if (token !== env.CONTROL_PLANE_INTERNAL_TOKEN) {
    return json({ error: "Invalid internal bearer token" }, { status: 403 });
  }
  return null;
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function isBoardAccessSyncPayload(value: unknown): value is BoardAccessSyncPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const payload = value as Record<string, unknown>;
  if (!Array.isArray(payload.roles) || !Array.isArray(payload.companyMemberships)) return false;
  return true;
}

function isAgentKeySyncPayload(value: unknown): value is AgentKeySyncPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const key = (value as { key?: unknown }).key;
  return Boolean(key && typeof key === "object" && !Array.isArray(key));
}

async function handleInternalLiveEventPublish(
  request: Request,
  env: ControlPlaneEnv,
): Promise<Response> {
  const authError = assertInternalToken(request, env);
  if (authError) return authError;
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const body = await readJson(request);
  if (!isLiveEvent(body)) {
    return json({ error: "Invalid live event payload" }, { status: 400 });
  }

  const durableObjectId = env.COMPANY_REALTIME.idFromName(body.companyId);
  const headers = await buildSignedInternalPublishHeaders(env, body.companyId);
  headers.set("content-type", "application/json; charset=utf-8");
  const publishRequest = new Request(
    new URL(`/api/companies/${encodeURIComponent(body.companyId)}/events/ws`, request.url),
    {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    },
  );

  return env.COMPANY_REALTIME.get(durableObjectId).fetch(publishRequest);
}

async function handleBoardAccessSync(
  request: Request,
  env: ControlPlaneEnv,
): Promise<Response> {
  const authError = assertInternalToken(request, env);
  if (authError) return authError;
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const userId = new URL(request.url).searchParams.get("userId")?.trim() ?? "";
  if (!userId) {
    return json({ error: "userId query parameter is required" }, { status: 400 });
  }

  const body = await readJson(request);
  if (!isBoardAccessSyncPayload(body)) {
    return json({ error: "Invalid board access sync payload" }, { status: 400 });
  }

  await applyBoardAccessSnapshot(env.AUTH_DB, userId, body);
  return json({ ok: true });
}

async function handleAgentKeySync(
  request: Request,
  env: ControlPlaneEnv,
): Promise<Response> {
  const authError = assertInternalToken(request, env);
  if (authError) return authError;
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const body = await readJson(request);
  if (!isAgentKeySyncPayload(body)) {
    return json({ error: "Invalid agent key sync payload" }, { status: 400 });
  }

  await applyAgentKeySnapshot(env.AUTH_DB, body);
  return json({ ok: true });
}
