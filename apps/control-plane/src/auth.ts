import { getCookieCache } from "better-auth/cookies";
import type { ControlPlaneEnv } from "./env";
import { createHmacSignature, decodeBase64UrlJson, sha256Hex } from "./crypto";
import { findAgentKeyByHash, getBoardAccessSnapshot, touchAgentKeyLastUsed } from "./auth-db";

type BoardCookieCache = {
  session: {
    id: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
    expiresAt: Date;
    token: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    [key: string]: unknown;
  };
  user: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    email: string;
    emailVerified: boolean;
    name: string;
    image?: string | null;
    [key: string]: unknown;
  };
  updatedAt: number;
  version?: string;
};

export type AuthorizedRealtimeActor = {
  actorType: "board" | "agent";
  actorId: string;
  companyId: string;
};

type AuthorizationResult =
  | { ok: true; actor: AuthorizedRealtimeActor }
  | { ok: false; status: number; error: string };

type JwtClaims = {
  sub?: string;
  company_id?: string;
  run_id?: string;
  adapter_type?: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
};

function parseBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) {
    const token = header.slice("bearer ".length).trim();
    if (token.length > 0) return token;
  }

  const token = new URL(request.url).searchParams.get("token")?.trim() ?? "";
  return token.length > 0 ? token : null;
}

async function readBoardCookieCache(
  request: Request,
  env: ControlPlaneEnv,
): Promise<BoardCookieCache | null> {
  const secret =
    env.BETTER_AUTH_SECRET?.trim() ||
    env.PAPERCLIP_AGENT_JWT_SECRET?.trim() ||
    "";
  if (!secret) return null;

  return (
    await getCookieCache<BoardCookieCache>(request, {
      secret,
      strategy: "jwe",
      isSecure: true,
    })
  ) ?? (
    await getCookieCache<BoardCookieCache>(request, {
      secret,
      strategy: "jwe",
      isSecure: false,
    })
  );
}

function decodeBase64UrlString(value: string): string | null {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
    return new TextDecoder().decode(
      Uint8Array.from(atob(`${normalized}${padding}`), (char) => char.charCodeAt(0)),
    );
  } catch {
    return null;
  }
}

async function verifyAgentJwt(
  token: string,
  env: ControlPlaneEnv,
): Promise<JwtClaims | null> {
  const secret = env.PAPERCLIP_AGENT_JWT_SECRET?.trim();
  if (!secret) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [headerPart, claimsPart, signaturePart] = parts;
  const payload = `${headerPart}.${claimsPart}`;
  const signature = await crypto.subtle.sign(
    "HMAC",
    await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    ),
    new TextEncoder().encode(payload),
  );
  const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  if (expectedSignature !== signaturePart) return null;

  const header = decodeBase64UrlJson<{ alg?: string }>(headerPart);
  if (!header || header.alg !== "HS256") return null;

  const claimsText = decodeBase64UrlString(claimsPart);
  if (!claimsText) return null;
  let claims: JwtClaims;
  try {
    claims = JSON.parse(claimsText) as JwtClaims;
  } catch {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof claims.exp !== "number" || claims.exp < now) return null;
  if (typeof claims.sub !== "string" || typeof claims.company_id !== "string") return null;
  if (typeof claims.run_id !== "string" || typeof claims.adapter_type !== "string") return null;

  const issuer = env.PAPERCLIP_AGENT_JWT_ISSUER?.trim() || "paperclip";
  const audience = env.PAPERCLIP_AGENT_JWT_AUDIENCE?.trim() || "paperclip-api";
  if (typeof claims.iss === "string" && claims.iss !== issuer) return null;
  if (typeof claims.aud === "string" && claims.aud !== audience) return null;

  return claims;
}

async function authorizeBoardRealtimeRequest(
  request: Request,
  env: ControlPlaneEnv,
  companyId: string,
): Promise<AuthorizationResult> {
  const cache = await readBoardCookieCache(request, env);
  const userId = cache?.user?.id;
  if (!userId) {
    return { ok: false, status: 401, error: "Board session required" };
  }

  const access = await getBoardAccessSnapshot(env.AUTH_DB, userId);
  if (!access.isInstanceAdmin && !access.companyIds.includes(companyId)) {
    return { ok: false, status: 403, error: "User does not have access to this company" };
  }

  return {
    ok: true,
    actor: {
      actorType: "board",
      actorId: userId,
      companyId,
    },
  };
}

async function authorizeAgentRealtimeRequest(
  request: Request,
  env: ControlPlaneEnv,
  companyId: string,
  token: string,
): Promise<AuthorizationResult> {
  const keyHash = await sha256Hex(token);
  const key = await findAgentKeyByHash(env.AUTH_DB, keyHash);
  if (key && !key.revoked_at) {
    if (key.company_id !== companyId) {
      return { ok: false, status: 403, error: "Agent key cannot access another company" };
    }

    const now = new Date().toISOString();
    await touchAgentKeyLastUsed(env.AUTH_DB, key.id, now);
    return {
      ok: true,
      actor: {
        actorType: "agent",
        actorId: key.agent_id,
        companyId,
      },
    };
  }

  const claims = await verifyAgentJwt(token, env);
  if (!claims || claims.company_id !== companyId || !claims.sub) {
    return { ok: false, status: 403, error: "Agent token is not authorized for this company" };
  }

  return {
    ok: true,
    actor: {
      actorType: "agent",
      actorId: claims.sub,
      companyId,
    },
  };
}

export async function authorizeRealtimeRequest(
  request: Request,
  env: ControlPlaneEnv,
  companyId: string,
): Promise<AuthorizationResult> {
  const token = parseBearerToken(request);
  if (token) {
    return authorizeAgentRealtimeRequest(request, env, companyId, token);
  }

  return authorizeBoardRealtimeRequest(request, env, companyId);
}

export function getInternalBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) return null;
  const token = header.slice("bearer ".length).trim();
  return token.length > 0 ? token : null;
}

export function buildSignedProxyHeaders(
  env: ControlPlaneEnv,
  actor: AuthorizedRealtimeActor,
): Promise<Headers> {
  const headers = new Headers();
  headers.set("x-paperclip-company-id", actor.companyId);
  headers.set("x-paperclip-actor-type", actor.actorType);
  headers.set("x-paperclip-actor-id", actor.actorId);
  return finalizeProxyHeaders(env, headers, "ws-upgrade");
}

export async function buildSignedInternalPublishHeaders(
  env: ControlPlaneEnv,
  companyId: string,
): Promise<Headers> {
  const headers = new Headers();
  headers.set("x-paperclip-company-id", companyId);
  return finalizeProxyHeaders(env, headers, "publish-live-event");
}

async function finalizeProxyHeaders(
  env: ControlPlaneEnv,
  headers: Headers,
  scope: "ws-upgrade" | "publish-live-event",
): Promise<Headers> {
  const timestamp = Date.now().toString();
  headers.set("x-paperclip-scope", scope);
  headers.set("x-paperclip-signed-at", timestamp);
  headers.set(
    "x-paperclip-signature",
    await createHmacSignature(env.CONTROL_PLANE_INTERNAL_TOKEN, [
      scope,
      headers.get("x-paperclip-company-id") ?? "",
      headers.get("x-paperclip-actor-type") ?? "",
      headers.get("x-paperclip-actor-id") ?? "",
      timestamp,
    ]),
  );
  return headers;
}
