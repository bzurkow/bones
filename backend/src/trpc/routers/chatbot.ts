import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/index.js";
import { chatbotConversations, chatbotMessages } from "../../db/schema.js";
import { CHATBOT_FEATURE_KEY } from "../../organization-permissions.js";
import { requireOrganizationPermission, router } from "../trpc.js";

// Deliberately one procedure, matching the app's current single-thread-
// per-(org, user) UI (Chatbot.tsx always continues the caller's own most
// recent conversation, "New chat" is a client-side reset -- see the
// chatbot-schema.ts's own comment). requireOrganizationPermission(
// CHATBOT_FEATURE_KEY) is the same RBAC primitive every other org-gated
// procedure already uses (trpc/trpc.ts) -- no new access-control code
// needed here, just the right feature key.
export const chatbotRouter = router({
  getHistory: requireOrganizationPermission(CHATBOT_FEATURE_KEY)
    .input(z.object({ organizationId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const [conversation] = await db
        .select({ id: chatbotConversations.id })
        .from(chatbotConversations)
        .where(
          and(
            eq(chatbotConversations.organizationId, input.organizationId),
            eq(chatbotConversations.userId, ctx.session.user.id),
          ),
        )
        .orderBy(desc(chatbotConversations.updatedAt))
        .limit(1);

      if (!conversation) {
        return { conversationId: null as string | null, messages: [] };
      }

      const messages = await db
        .select({
          id: chatbotMessages.id,
          role: chatbotMessages.role,
          content: chatbotMessages.content,
          createdAt: chatbotMessages.createdAt,
        })
        .from(chatbotMessages)
        .where(eq(chatbotMessages.conversationId, conversation.id))
        .orderBy(asc(chatbotMessages.createdAt));

      return { conversationId: conversation.id as string | null, messages };
    }),
});
