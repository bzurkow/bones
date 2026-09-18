import type { Logger as DrizzleLogger } from "drizzle-orm/logger";
import { getLogContext } from "./request-context.js";
import { REDACTED, SENSITIVE_TABLES } from "./redact.js";
import { dbChangeLog } from "./log-streams.js";

// Matches the leading verb of a statement drizzle-orm hands to
// logQuery -- SELECTs are deliberately not matched (this is a change log,
// not a query log; logging every read too would multiply file volume for
// no auditing value and start capturing the shape of read-side data
// browsing, which isn't "a database change"). Anchored to the start of the
// (trimmed) string: every statement drizzle-orm's query builders and raw
// `db.execute(sql\`...\`)` produce starts with the bare verb, no leading
// CTE/comment wrapping to worry about here.
const WRITE_OP_RE = /^\s*(insert|update|delete)\b/i;

// Pulls the table name out of the same statement, for the three shapes
// drizzle-orm's node-postgres dialect actually generates:
//   insert into "table" (...)
//   update "table" set ...
//   delete from "table" where ...
// Quoted or not (drizzle always quotes, but this doesn't assume that).
// Falls back to `undefined` (rather than throwing) for anything shaped
// differently -- a raw db.execute(sql\`...\`) with unusual formatting
// still gets logged, just without a table name, rather than being dropped.
const TABLE_RE = /^\s*(?:insert\s+into|update|delete\s+from)\s+"?([a-zA-Z_][a-zA-Z0-9_]*)"?/i;

export interface DbWriteLogEntry {
  event: "db.write";
  operation: string;
  table: string | undefined;
  sql: string | undefined;
  params: unknown;
}

// Pure classification, kept separate from the actual pino call below so
// db-change-logger.test.ts can assert on it directly without touching a
// real log file. Returns null for anything that isn't a write (the caller
// skips logging entirely rather than logging a "not a write" line).
//
// Redaction happens here, at the one place a write's target table is
// known, not in redact.ts's key-name-based redactObject -- drizzle-orm's
// Logger interface only ever hands over a positional `params: unknown[]`
// (see logger.d.ts), with no column names attached to match a key-name
// rule against. SENSITIVE_TABLES (accounts/verifications/sessions) is the
// coarser tool available at this layer: redact the whole params array
// (and the SQL text with it, since bind-mode SQL from these tables is
// otherwise still useless without its params) rather than one field.
export function classifyQuery(sql: string, params: unknown[]): DbWriteLogEntry | null {
  const opMatch = WRITE_OP_RE.exec(sql);
  if (!opMatch) return null;

  const table = TABLE_RE.exec(sql)?.[1];
  const sensitive = table !== undefined && SENSITIVE_TABLES.has(table);

  return {
    event: "db.write",
    operation: opMatch[1]!.toLowerCase(),
    table,
    sql: sensitive ? REDACTED : sql,
    params: sensitive ? REDACTED : params,
  };
}

// Wired into db/index.ts's `drizzle(pool, { schema, logger: dbChangeLogger })`
// -- drizzle-orm's own designed extension point for observing every query
// it sends, transactions included (a db.transaction(...) callback's `tx`
// is built from the same client/logger, so writes inside one -- e.g.
// organizations.ts's `create` -- are covered without their own
// instrumentation). This is the actual "plugin to drizzle" property: any
// future insert/update/delete, on any table, from any call site, is
// logged the moment it's written, with zero changes to that call site.
//
// One real limitation, worth stating rather than leaving implicit: this
// logs a statement being *sent*, not a confirmed outcome -- drizzle-orm's
// Logger interface fires before the driver round-trip resolves, so there's
// no row count, no returning() payload, and a statement that the DB
// itself later rejects (a constraint violation) still gets a log line
// here. Good enough for "what was attempted, by whom, when" -- the
// customer-facing, outcome-aware audit trail (a semantic "member X was
// added to org Y") discussed separately is a different, higher-level
// feature built from the app's own mutations, not a replacement for this.
export const dbChangeLogger: DrizzleLogger = {
  logQuery(query, params) {
    const entry = classifyQuery(query, params);
    if (!entry) return;
    dbChangeLog.info({ ...entry, ...getLogContext(), occurredAt: new Date().toISOString() });
  },
};
