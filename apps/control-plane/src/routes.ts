export const HEALTH_PATH = "/api/health";
export const REALTIME_ROUTE_PATTERN = "/api/companies/:companyId/events/ws";
export const INTERNAL_LIVE_EVENT_PUBLISH_PATH = "/internal/realtime/publish";
export const INTERNAL_BOARD_ACCESS_SYNC_PATH = "/internal/realtime/sync/board-access";
export const INTERNAL_AGENT_KEY_SYNC_PATH = "/internal/realtime/sync/agent-key";

const companyRealtimePathRegex = /^\/api\/companies\/([^/]+)\/events\/ws$/;

export function matchCompanyRealtimePath(pathname: string): string | null {
  const match = companyRealtimePathRegex.exec(pathname);
  if (!match) {
    return null;
  }

  return decodeURIComponent(match[1]);
}
