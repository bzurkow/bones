import { sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { publicProcedure, router } from "../trpc.js";

export const dbRouter = router({
  ping: publicProcedure.query(async () => {
    const result = await db.execute(sql`SELECT 1 AS ok`);
    return { status: "ok" as const, row: result.rows[0] };
  }),
});
