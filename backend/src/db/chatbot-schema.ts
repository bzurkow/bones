import { relations } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./auth-schema.js";
import { organizations } from "./organizations-schema.js";

// One ongoing thread per (organization, user) is the only shape the app
// actually surfaces right now (Chatbot.tsx always continues the caller's
// most recent conversation in the chosen org, "New chat" just drops
// conversationId client-side to start a fresh one) -- but conversations
// are still their own real rows, not folded into organization_users, so a
// user having multiple threads over time (and, someday, a real
// conversation switcher) doesn't need a schema change later. `id` is a
// plain text PK, app-generated via crypto.randomUUID() -- same convention
// as organizations.id/terms_and_conditions.id, not a DB-side default.
export const chatbotConversations = pgTable("chatbot_conversations", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // Null until something sets it (no title-generation step exists yet --
  // left for later rather than speculatively built now); chatbot.ts's
  // getHistory doesn't need it, this is here for whenever a real
  // conversation list UI needs something to show per thread.
  title: text("title"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const chatbotMessages = pgTable("chatbot_messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => chatbotConversations.id, { onDelete: "cascade" }),
  // Same enum-column convention as users.viewMode (auth-schema.ts) --
  // a real Postgres CHECK, not just a TS-level union. There's no
  // "system" role stored here -- the system prompt lives in
  // lib/chat/provider.ts, not in conversation history.
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chatbotConversationsRelations = relations(chatbotConversations, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [chatbotConversations.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [chatbotConversations.userId],
    references: [users.id],
  }),
  messages: many(chatbotMessages),
}));

export const chatbotMessagesRelations = relations(chatbotMessages, ({ one }) => ({
  conversation: one(chatbotConversations, {
    fields: [chatbotMessages.conversationId],
    references: [chatbotConversations.id],
  }),
}));
