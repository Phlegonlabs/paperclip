import { HEALTH_PATH, REALTIME_ROUTE_PATTERN } from "./routes";

export type ControlPlaneEnv = {
  ASSETS: Fetcher;
  AUTH_DB: D1Database;
  COMPANY_REALTIME: DurableObjectNamespace;
  CONTROL_PLANE_INTERNAL_TOKEN: string;
  BETTER_AUTH_SECRET?: string;
  PAPERCLIP_AGENT_JWT_SECRET?: string;
  PAPERCLIP_AGENT_JWT_ISSUER?: string;
  PAPERCLIP_AGENT_JWT_AUDIENCE?: string;
  CONTROL_PLANE_ENV?: "development" | "staging" | "production" | "test";
};

export type HealthPayload = {
  status: "ok";
  service: "control-plane";
  deployment: NonNullable<ControlPlaneEnv["CONTROL_PLANE_ENV"]>;
  routing: {
    assets: "same-origin";
    health: typeof HEALTH_PATH;
    realtime: typeof REALTIME_ROUTE_PATTERN;
  };
};
