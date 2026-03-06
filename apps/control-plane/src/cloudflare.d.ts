declare type Fetcher = {
  fetch(input: Request | string | URL, init?: RequestInit): Promise<Response>;
};

declare type DurableObjectId = unknown;

declare type DurableObjectNamespace = {
  idFromName(name: string): DurableObjectId;
  get(id: DurableObjectId): Fetcher;
};

declare type D1Result<T = Record<string, unknown>> = {
  results?: T[];
  success: boolean;
  meta?: Record<string, unknown>;
};

declare type D1PreparedStatement = {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(columnName?: string): Promise<T | null>;
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
};

declare type D1Database = {
  prepare(query: string): D1PreparedStatement;
  exec(query: string): Promise<D1Result>;
};

declare type DurableObjectState = {
  acceptWebSocket(socket: WebSocket): void;
  getWebSockets(): WebSocket[];
};

declare type ExecutionContext = {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
};

declare type ExportedHandler<Env = unknown> = {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Response | Promise<Response>;
};

declare var WebSocketPair: {
  new (): {
    0: WebSocket;
    1: WebSocket;
  };
};
