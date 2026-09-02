import type { IncomingHttpHeaders } from "node:http";

// Fastify hands back Node's plain IncomingHttpHeaders (string | string[] |
// undefined per key); anything that wants a standard Fetch Request (Better
// Auth's handler, and better-auth's own auth.api.getSession() call used to
// build tRPC's context) needs a real Headers object instead. Shared so the
// conversion logic -- and its one subtlety, joining repeated headers with
// ", " rather than dropping all but one -- lives in one place.
export function toFetchHeaders(rawHeaders: IncomingHttpHeaders): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(rawHeaders)) {
    if (value) headers.append(key, Array.isArray(value) ? value.join(", ") : value);
  }
  return headers;
}
