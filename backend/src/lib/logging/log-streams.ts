import pino from "pino";

// The two file-backed log streams this app writes to -- see this
// directory's own README-shaped comment in register.ts for the overall
// design. Both roll on the same policy (daily, or 20MB, whichever comes
// first) via pino-roll, a pino transport that owns the actual file
// lifecycle (opening, closing, renaming) so nothing here has to. Kept as
// two separate files rather than one, tagged by `event`, because they have
// different retention/sensitivity expectations in practice (db-changes.log
// is the one that can contain row data) even though today they share the
// same rotation policy and archival job (log-archiver.ts sweeps the whole
// directory, not per-file).
const LOG_DIR = process.env.LOG_DIR ?? "./logs";

// `date-fns`-style token (pino-roll's own dependency, not ours). pino-roll
// names every file it writes -- the one currently being appended to
// included, not just ones already rotated out -- "<file>.<date>.<count>
// <extension>" (e.g. "requests.2026-09-18.0.log"), so a file's own name
// always says which day it covers without opening it. log-archiver.ts's
// isArchivable relies on exactly that: a file dated before today is
// guaranteed closed, because pino-roll can't have written today's date
// into it before today.
const DATE_FORMAT = "yyyy-MM-dd";

// Exported (not just used below) so log-streams.test.ts can point a real
// pino-roll transport at a throwaway temp directory instead of LOG_DIR --
// proving the options this file passes are ones pino-roll actually
// accepts, without depending on module-load-time env vars or clobbering
// this process's real ./logs directory.
export function createRollingLogger(name: string, dir: string = LOG_DIR) {
  return pino(
    pino.transport({
      target: "pino-roll",
      options: {
        file: `${dir}/${name}`,
        extension: ".log",
        frequency: "daily",
        dateFormat: DATE_FORMAT,
        size: "20m",
        mkdir: true,
        limit: { count: 30 },
      },
    }),
  );
}

// "All requests made by a user" -- both the raw HTTP access line
// (register.ts's onResponse hook, every route) and the richer per-call
// line (trpc.ts's logging middleware, every procedure) land here. See
// request-log.ts for the two entry shapes.
export const requestLog = createRollingLogger("requests");

// "All database changes" -- every INSERT/UPDATE/DELETE drizzle sends to
// Postgres, from any table, any call site, present or future. See
// db-change-logger.ts, wired into db/index.ts's drizzle({ logger }) option.
export const dbChangeLog = createRollingLogger("db-changes");
