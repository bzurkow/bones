import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { dbChangeLogger } from "../lib/logging/db-change-logger.js";
import * as schema from "./schema.js";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// `logger: dbChangeLogger` is the one place "all database changes get
// logged" is actually wired in -- drizzle calls it for every query this
// `db` instance (and every db.transaction(...) built from it) sends,
// insert/update/delete alike, on any table, without any call site opting
// in. See db-change-logger.ts's own comment for what it does with that and
// its one real limitation (a statement being sent, not a confirmed
// outcome).
export const db = drizzle(pool, { schema, logger: dbChangeLogger });
