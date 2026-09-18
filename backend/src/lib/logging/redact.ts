// Shared by the tRPC call log (request-log.ts, redacting procedure input)
// and the DB write log (db-change-logger.ts, redacting whole rows for a
// handful of tables) -- one redaction rule for anything that ends up in a
// log file, so a new password/token-shaped field added anywhere doesn't
// need its own opt-in.

// Matches by key name, not by table/procedure -- a field named
// `newPassword`, `refreshToken`, `idToken`, or `secret` gets redacted
// wherever it appears (nested objects included), independent of which
// procedure or table it came from. Deliberately broad: false positives
// (redacting a harmless "tokenCount" field) cost nothing; false negatives
// (a real secret slipping into a log file) are the failure mode this
// exists to prevent.
const SENSITIVE_KEY_RE = /password|token|secret/i;

export const REDACTED = "[redacted]";

// Recursively walks a plain object/array (JSON-shaped -- everything
// getRawInput() and a params array already is) and blanks any value whose
// key matches SENSITIVE_KEY_RE. Non-plain values (Date, class instances)
// are returned as-is rather than descended into -- nothing in tRPC input
// or SQL params is expected to be one, and pino's own serializer already
// handles them fine if one shows up.
export function redactObject(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactObject);

  if (value && typeof value === "object" && value.constructor === Object) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, val]) => [
        key,
        SENSITIVE_KEY_RE.test(key) ? REDACTED : redactObject(val),
      ]),
    );
  }

  return value;
}

// Tables whose rows can contain a raw secret in plaintext (a password
// hash, an OAuth token, a password-reset/verification token) rather than
// just a field that happens to be *named* like one -- redactObject's
// key-name rule can't help here because the DB write log only ever sees a
// positional params array (drizzle-orm's Logger interface hands over
// `(query: string, params: unknown[])`, no column names attached), so
// there's no key to match against. Any write to one of these tables logs
// its shape (table + operation) but not its params -- see
// db-change-logger.ts's classifyQuery.
export const SENSITIVE_TABLES = new Set(["accounts", "verifications", "sessions"]);
