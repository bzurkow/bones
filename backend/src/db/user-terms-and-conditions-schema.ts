import { relations } from "drizzle-orm";
import { boolean, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./auth-schema.js";
import { termsAndConditions } from "./terms-and-conditions-schema.js";

// Join table between users and terms_and_conditions -- one row per
// (user, version) pair a user has ever been asked to accept, so a new
// version (a new terms_and_conditions row, see that file) means every user
// needs a fresh row here too. Composite primary key rather than a synthetic
// id: there's nothing else that could meaningfully identify a row, and it
// keeps "has this user already got a row for this version" a plain
// upsert-by-key instead of a separate uniqueness check.
export const userTermsAndConditions = pgTable(
  "user_terms_and_conditions",
  {
    termsAndConditionsId: text("terms_and_conditions_id")
      .notNull()
      .references(() => termsAndConditions.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accepted: boolean("accepted").notNull().default(false),
    acceptedDate: timestamp("accepted_date"),
  },
  (table) => [primaryKey({ columns: [table.termsAndConditionsId, table.userId] })],
);

export const userTermsAndConditionsRelations = relations(userTermsAndConditions, ({ one }) => ({
  termsAndConditions: one(termsAndConditions, {
    fields: [userTermsAndConditions.termsAndConditionsId],
    references: [termsAndConditions.id],
  }),
  user: one(users, {
    fields: [userTermsAndConditions.userId],
    references: [users.id],
  }),
}));
