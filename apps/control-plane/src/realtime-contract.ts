import { LIVE_EVENT_TYPES, type LiveEvent } from "@paperclipai/shared";
import type { ControlPlaneEnv } from "./env";
import { verifyHmacSignature } from "./crypto";

const SIGNATURE_MAX_SKEW_MS = 60_000;

export type SignedRealtimeRequest = {
  companyId: string;
  scope: "ws-upgrade" | "publish-live-event";
  actorType: string | null;
  actorId: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isLiveEvent(value: unknown): value is LiveEvent {
  if (!isRecord(value)) return false;
  if (typeof value.id !== "number" || !Number.isFinite(value.id)) return false;
  if (typeof value.companyId !== "string" || value.companyId.length === 0) return false;
  if (typeof value.type !== "string" || !LIVE_EVENT_TYPES.includes(value.type as (typeof LIVE_EVENT_TYPES)[number])) {
    return false;
  }
  if (typeof value.createdAt !== "string" || value.createdAt.length === 0) return false;
  return isRecord(value.payload);
}

export async function verifySignedRealtimeRequest(
  request: Request,
  env: ControlPlaneEnv,
  expectedScope: "ws-upgrade" | "publish-live-event",
): Promise<SignedRealtimeRequest | null> {
  const companyId = request.headers.get("x-paperclip-company-id");
  const scope = request.headers.get("x-paperclip-scope");
  const signedAt = request.headers.get("x-paperclip-signed-at");
  const signature = request.headers.get("x-paperclip-signature");
  const actorType = request.headers.get("x-paperclip-actor-type");
  const actorId = request.headers.get("x-paperclip-actor-id");

  if (!companyId || !scope || !signedAt || !signature) return null;
  if (scope !== expectedScope) return null;

  const signedAtMs = Number(signedAt);
  if (!Number.isFinite(signedAtMs)) return null;
  if (Math.abs(Date.now() - signedAtMs) > SIGNATURE_MAX_SKEW_MS) return null;

  const valid = await verifyHmacSignature(env.CONTROL_PLANE_INTERNAL_TOKEN, [
    scope,
    companyId,
    actorType ?? "",
    actorId ?? "",
    signedAt,
  ], signature);
  if (!valid) return null;

  return {
    companyId,
    scope,
    actorType,
    actorId,
  };
}
