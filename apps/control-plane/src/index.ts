import type { ControlPlaneEnv } from "./env";
import { handleRequest } from "./app";

export { CompanyRealtimeHub } from "./realtime-do";

const worker: ExportedHandler<ControlPlaneEnv> = {
  fetch(request, env, _ctx) {
    return handleRequest(request, env);
  },
};

export default worker;

