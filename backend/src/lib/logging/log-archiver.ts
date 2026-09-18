import { readFile, readdir, unlink } from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import cron from "node-cron";
import { LOG_BUCKET, s3Client } from "../../storage/index.js";

const LOG_DIR = process.env.LOG_DIR ?? "./logs";

// A file is safe to ship off and delete once it's no longer the file
// pino-roll is actively appending to. Rather than guess at that from
// mtime/size (both keep changing on an active file right up until the
// instant it stops, so there's no safe threshold), this relies on
// log-streams.ts's dateFormat: every rotated file's name carries the
// calendar day it covers ("requests.log.2026-09-17", or
// "requests.log.2026-09-17.0" if a size-triggered rotation also happened
// that day). A file dated strictly before today is guaranteed closed --
// pino-roll only ever writes today's date into a new file at or after
// midnight. Exported for log-archiver.test.ts to check directly, without
// touching the filesystem or S3.
export function isArchivable(filename: string, today: string): boolean {
  const match = /\d{4}-\d{2}-\d{2}/.exec(filename);
  if (!match) return false; // no date in the name -- e.g. today's not-yet-rotated file
  return match[0] < today;
}

// The scheduled part of "logs written to files that can be ... stored in
// long term storage": rotation (log-streams.ts/pino-roll) closes files,
// this ships closed ones to S3 and clears them off local disk, on its own
// schedule -- not tied to rotation firing an event (pino-roll doesn't
// expose one), which is exactly why isArchivable above checks the
// filename's own date rather than reacting to a rotation callback.
//
// Deliberately tolerant of a mid-run failure: each file is uploaded and
// only then deleted, one at a time, and one file's S3 error doesn't stop
// the rest of the sweep. A file that fails to upload simply stays local
// (still dated before today, so it's picked up again on the next
// scheduled run) rather than being lost -- the sweep is idempotent by
// construction, not by any extra bookkeeping.
export async function archiveOnce(): Promise<void> {
  if (!LOG_BUCKET) return;

  const today = new Date().toISOString().slice(0, 10);
  const files = await readdir(LOG_DIR).catch(() => [] as string[]);

  for (const file of files) {
    if (!isArchivable(file, today)) continue;

    const filePath = path.join(LOG_DIR, file);
    try {
      const body = await readFile(filePath);
      await s3Client.send(
        new PutObjectCommand({
          Bucket: LOG_BUCKET,
          Key: `logs/${file}`,
          Body: body,
          ContentType: "application/x-ndjson",
        }),
      );
      await unlink(filePath);
    } catch (err) {
      // Logged to stderr, not into requestLog/dbChangeLog -- a failure in
      // the archiver is an operational problem with logging itself, not a
      // request or a DB write, and routing it through the very files this
      // job manages would be a strange place for it to end up.
      console.error(`[log-archiver] failed to archive ${file}:`, err);
    }
  }
}

// Called once from index.ts at boot. No-ops (schedules nothing) when
// S3_LOG_BUCKET isn't set -- local rotation still runs either way, this
// only controls whether closed files also get shipped to long-term
// storage. Default: 00:05 daily, five minutes past the midnight boundary
// isArchivable's date comparison is built around, so yesterday's file is
// reliably closed by the time this runs. Override via LOG_ARCHIVE_CRON for
// a tighter schedule (e.g. hourly, to reduce how long a size-triggered
// same-day rotated file sits local before the *next* day makes it
// eligible) without a code change.
export function startLogArchiver(): void {
  if (!LOG_BUCKET) return;

  const schedule = process.env.LOG_ARCHIVE_CRON ?? "5 0 * * *";
  cron.schedule(schedule, () => {
    archiveOnce().catch((err) => console.error("[log-archiver] sweep failed:", err));
  });
}
