import { redactObject } from "./redact.js";
import { requestLog } from "./log-streams.js";

// The raw-HTTP line -- register.ts's onResponse hook fires this for
// *every* response Fastify sends, tRPC and non-tRPC routes alike
// (/health, /api/auth/*), which is what makes "all requests" true rather
// than "all tRPC calls." For a batched tRPC HTTP request this is one line
// covering the whole batch; logTrpcCall below is what breaks a batch back
// out into one line per procedure actually called.
export interface HttpLogEntry {
  event: "http.request";
  method: string;
  url: string;
  statusCode: number;
  durationMs: number;
  ip: string;
  requestId: string | undefined;
  userId: string | undefined;
  userEmail: string | undefined;
}

export function logHttpRequest(entry: HttpLogEntry): void {
  requestLog.info(entry);
}

// The per-procedure line -- trpc.ts's base logging middleware fires this
// once per procedure call, public and protected alike (see trpc.ts's own
// comment on why it sits below both). `input` is the procedure's raw,
// not-yet-zod-parsed input (tRPC's getRawInput(), the same escape hatch
// requireOrganizationPermission already relies on) -- logged as attempted
// even when zod validation itself is what ultimately fails, so a bad
// request still shows what was sent. Redacted the same way any other
// logged object is (redactObject, key-name based) before it ever reaches
// the log line.
export interface TrpcLogEntry {
  event: "trpc.call";
  path: string;
  type: "query" | "mutation" | "subscription";
  durationMs: number;
  ok: boolean;
  errorCode: string | undefined;
  requestId: string | undefined;
  userId: string | undefined;
  userEmail: string | undefined;
  input: unknown;
}

// Split from logTrpcCall below (pure builder vs. the actual pino call) so
// request-log.test.ts can assert on the redaction/shape without a real log
// file in the loop.
export function buildTrpcLogEntry(params: {
  path: string;
  type: "query" | "mutation" | "subscription";
  durationMs: number;
  ok: boolean;
  errorCode: string | undefined;
  requestId: string | undefined;
  userId: string | undefined;
  userEmail: string | undefined;
  rawInput: unknown;
}): TrpcLogEntry {
  return {
    event: "trpc.call",
    path: params.path,
    type: params.type,
    durationMs: params.durationMs,
    ok: params.ok,
    errorCode: params.errorCode,
    requestId: params.requestId,
    userId: params.userId,
    userEmail: params.userEmail,
    input: redactObject(params.rawInput),
  };
}

export function logTrpcCall(params: Parameters<typeof buildTrpcLogEntry>[0]): void {
  requestLog.info(buildTrpcLogEntry(params));
}
