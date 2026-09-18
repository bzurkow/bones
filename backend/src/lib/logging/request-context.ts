import { requestContext } from "@fastify/request-context";

// The store shape carried through one request's whole async lifecycle --
// set once at request start (register.ts's defaultStoreValues, for
// requestId/ip) and again once auth resolves (trpc.ts's createContext, for
// userId/userEmail, since that's the first point in the pipeline a session
// is actually looked up). @fastify/request-context backs `.get`/`.set`
// with AsyncLocalStorage, so anything running inside that request --
// including code with no access to the request/reply objects at all, like
// db-change-logger.ts's logQuery callback -- can read it. That's the whole
// reason this exists: it's what lets a DB write log line and a tRPC call
// log line both carry "who made this happen" without either the drizzle
// query layer or the tRPC router layer having to thread a userId parameter
// through every call.
declare module "@fastify/request-context" {
  interface RequestContextData {
    requestId: string;
    ip: string;
    // Optional, unlike requestId/ip above -- register.ts's
    // defaultStoreValues seeds requestId/ip for every request up front,
    // but userId/userEmail are only ever known once createContext resolves
    // a session (some requests, like /api/auth/* logins or a call made
    // with no session at all, never get them set).
    userId?: string;
    userEmail?: string;
  }
}

export { requestContext };

// Every reader (db-change-logger.ts, request-log.ts) wants the same three
// fields, always optional (userId/userEmail are only ever set once a
// session resolves; nothing is set at all outside of a real request --
// e.g. a script or test calling `db` directly, which is exactly what most
// of this backend's own test suite does). One helper instead of three
// separate `.get()` calls at each call site.
export function getLogContext(): { requestId?: string; userId?: string; userEmail?: string } {
  return {
    requestId: requestContext.get("requestId"),
    userId: requestContext.get("userId"),
    userEmail: requestContext.get("userEmail"),
  };
}
