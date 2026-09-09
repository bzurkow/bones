import { relations, sql } from "drizzle-orm";
import { boolean, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./auth-schema.js";
import { userTermsAndConditions } from "./user-terms-and-conditions-schema.js";

// Versioned, not mutated in place: an "update" (see
// trpc/routers/terms-and-conditions.ts) inserts a new row and flips the
// previous one's `active` off, rather than editing a single row -- so
// there's a real history of what each user actually agreed to, keyed by
// which row's `id` their acceptance (userTermsAndConditions) points at.
export const termsAndConditions = pgTable(
  "terms_and_conditions",
  {
    id: text("id").primaryKey(),
    // The S3 object key for this version's .md file (see storage/index.ts)
    // -- not a directly-fetchable URL despite the name; the `get`
    // procedure resolves it to a real presigned URL in its response.
    assetUrl: text("asset_url").notNull(),
    active: boolean("active").notNull().default(false),
    addedBy: text("added_by")
      .notNull()
      .references(() => users.id),
    termsAndConditionsAttribution: text("terms_and_conditions_attribution").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    // Partial unique index, not just "update's transaction always
    // deactivates the old row first" -- a real DB-level guarantee that at
    // most one row can ever be active, independent of whether every write
    // path remembers to maintain that invariant itself. Only indexes rows
    // where active = true, so any number of inactive (false) rows coexist
    // fine; a second concurrent attempt to activate a row would fail the
    // constraint rather than silently leaving two rows active.
    uniqueIndex("terms_and_conditions_active_uidx")
      .on(table.active)
      .where(sql`${table.active} = true`),
  ],
);

export const termsAndConditionsRelations = relations(termsAndConditions, ({ one, many }) => ({
  addedByUser: one(users, {
    fields: [termsAndConditions.addedBy],
    references: [users.id],
  }),
  acceptances: many(userTermsAndConditions),
}));
