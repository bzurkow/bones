import Fastify from "fastify";
import cors from "@fastify/cors";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import { and, desc, eq } from "drizzle-orm";
import { appRouter } from "./trpc/router.js";
import { createContext } from "./trpc/trpc.js";
import { auth } from "./auth.js";
import { db } from "./db/index.js";
import { chatbotConversations, chatbotMessages } from "./db/schema.js";
import { toFetchHeaders } from "./lib/fetch-headers.js";
import { getChatProvider, type ChatMessage } from "./lib/chat/index.js";
import { startLogArchiver } from "./lib/logging/log-archiver.js";
import { registerRequestLogging } from "./lib/logging/register.js";
import { CHATBOT_FEATURE_KEY, canUpdateOrg } from "./organization-permissions.js";
import { trustedOrigins } from "./trusted-origins.js";

const CHATBOT_MAX_MESSAGE_LENGTH = 8000;
const CHATBOT_HISTORY_LIMIT = 40;

// find-my-way's default maxParamLength (100) caps every route param,
// including the one the tRPC fastify adapter registers for its catch-all
// "/trpc/:path" route -- and tRPC's httpBatchLink puts every batched
// procedure's dotted name, comma-joined, into that exact param (e.g. a
// page batching organizations.listMembers + organizations.roles.list
// together already exceeds 100 chars). Past the limit, find-my-way
// doesn't 404 the route -- it 414s the whole request before tRPC's own
// handler ever runs, which is indistinguishable from the network up
// failing outright client-side. Raised well past anything a realistic
// batch of procedure names could hit.
const server = Fastify({ logger: true, maxParamLength: 5000 });

// Registered before anything else -- see registerRequestLogging's own
// comment on why top-level (not nested inside one of the plugin blocks
// below) is what makes it apply to every route, tRPC and otherwise.
await registerRequestLogging(server);

await server.register(cors, { origin: trustedOrigins, credentials: true });

server.get("/health", async () => ({ status: "ok" }));

// Better Auth's handler expects a standard Fetch Request/Response. It also
// needs the raw, unparsed body to reconstruct that Request correctly, so
// this is scoped to its own plugin context with a pass-through content-type
// parser rather than Fastify's default JSON body parsing.
await server.register(async (instance) => {
  // Fastify's built-in "application/json" parser is more specific than a
  // bare wildcard and wins regardless of which scope registers the
  // wildcard, so it needs an explicit override here too, not just "*".
  instance.addContentTypeParser("application/json", { parseAs: "buffer" }, (_req, body, done) => done(null, body));
  instance.addContentTypeParser("*", { parseAs: "buffer" }, (_req, body, done) => done(null, body));

  instance.all("/api/auth/*", async (request, reply) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const headers = toFetchHeaders(request.headers);

    const init: RequestInit = { method: request.method, headers };
    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = new Uint8Array(request.body as Buffer);
    }

    const response = await auth.handler(new Request(url, init));

    reply.status(response.status);
    response.headers.forEach((value, key) => reply.header(key, value));
    reply.send(response.body ? Buffer.from(await response.arrayBuffer()) : null);
  });
});

// Plain Fastify route, not a tRPC procedure -- there's no WebSocket
// adapter wired up here, so this is the only way to stream a chunked
// response back token-by-token (see lib/chat/'s ChatProvider). Body comes
// through Fastify's normal default JSON parsing (this route isn't inside
// the raw-body plugin scope above, so it doesn't need one), but the
// *response* is written by hand straight to `reply.raw` -- newline-
// delimited JSON, not `text/event-stream`, since the client sends this as
// a plain POST (EventSource is GET-only and can't carry the message body).
server.post("/chatbot/stream", async (request, reply) => {
  const session = await auth.api.getSession({ headers: toFetchHeaders(request.headers) });
  if (!session) {
    reply.code(401).send({ error: "Unauthorized" });
    return;
  }

  const body = request.body as { organizationId?: unknown; conversationId?: unknown; content?: unknown };
  const organizationId = typeof body.organizationId === "string" ? body.organizationId : undefined;
  const conversationId = typeof body.conversationId === "string" ? body.conversationId : undefined;
  const content = typeof body.content === "string" ? body.content.trim() : undefined;

  if (!organizationId || !content) {
    reply.code(400).send({ error: "organizationId and content are required." });
    return;
  }
  if (content.length > CHATBOT_MAX_MESSAGE_LENGTH) {
    reply.code(400).send({ error: `A message can't be longer than ${CHATBOT_MAX_MESSAGE_LENGTH} characters.` });
    return;
  }

  // Same check requireOrganizationPermission(CHATBOT_FEATURE_KEY) performs
  // for trpc/routers/chatbot.ts's getHistory -- canUpdateOrg, not the
  // narrower hasOrganizationPermission, so the global
  // admin.organizations.update override applies here too. Getting that
  // wrong would be a real, confusing bug: an admin using the override
  // could load history (getHistory) but then get 403'd the moment they
  // tried to actually send a message.
  if (!(await canUpdateOrg(organizationId, session.user.id, session.user.role, CHATBOT_FEATURE_KEY))) {
    reply.code(403).send({ error: "Forbidden" });
    return;
  }

  let activeConversationId = conversationId;
  if (activeConversationId) {
    const [existing] = await db
      .select({ id: chatbotConversations.id })
      .from(chatbotConversations)
      .where(
        and(
          eq(chatbotConversations.id, activeConversationId),
          eq(chatbotConversations.organizationId, organizationId),
          eq(chatbotConversations.userId, session.user.id),
        ),
      );
    if (!existing) {
      reply.code(404).send({ error: "Conversation not found." });
      return;
    }
  } else {
    const [created] = await db
      .insert(chatbotConversations)
      .values({
        id: crypto.randomUUID(),
        organizationId,
        userId: session.user.id,
        // A plain truncation of the first message, not a real
        // title-generation step -- chatbotConversations.title exists for
        // a future conversation-list UI (see chatbot-schema.ts's own
        // comment), nothing reads it yet.
        title: content.slice(0, 80),
      })
      .returning({ id: chatbotConversations.id });
    activeConversationId = created?.id;
  }
  if (!activeConversationId) {
    reply.code(500).send({ error: "Couldn't start that conversation." });
    return;
  }

  await db.insert(chatbotMessages).values({
    id: crypto.randomUUID(),
    conversationId: activeConversationId,
    role: "user",
    content,
  });

  // Most recent CHATBOT_HISTORY_LIMIT rows, oldest first -- bounds the
  // context (and so the cost/latency) sent to the model on a long-running
  // conversation. Includes the user message just inserted above (it's the
  // newest row), so there's no separate "history + new message" concat.
  const recentMessages = await db
    .select({ role: chatbotMessages.role, content: chatbotMessages.content })
    .from(chatbotMessages)
    .where(eq(chatbotMessages.conversationId, activeConversationId))
    .orderBy(desc(chatbotMessages.createdAt))
    .limit(CHATBOT_HISTORY_LIMIT);
  const history: ChatMessage[] = recentMessages.reverse();

  reply.raw.writeHead(200, {
    "content-type": "application/x-ndjson; charset=utf-8",
    "cache-control": "no-cache",
  });

  let assistantText = "";
  try {
    for await (const delta of getChatProvider().streamReply(history)) {
      assistantText += delta;
      reply.raw.write(`${JSON.stringify({ type: "delta", text: delta })}\n`);
    }
  } catch (err) {
    // No partial assistant row persisted on a mid-stream failure -- the
    // client still has whatever text it already rendered and can just
    // retry the same message.
    reply.raw.write(
      `${JSON.stringify({ type: "error", message: err instanceof Error ? err.message : "The chat model failed." })}\n`,
    );
    reply.raw.end();
    return;
  }

  const [assistantMessage] = await db
    .insert(chatbotMessages)
    .values({
      id: crypto.randomUUID(),
      conversationId: activeConversationId,
      role: "assistant",
      content: assistantText,
    })
    .returning({ id: chatbotMessages.id });
  await db
    .update(chatbotConversations)
    .set({ updatedAt: new Date() })
    .where(eq(chatbotConversations.id, activeConversationId));

  reply.raw.write(
    `${JSON.stringify({ type: "done", conversationId: activeConversationId, messageId: assistantMessage?.id })}\n`,
  );
  reply.raw.end();
});

await server.register(fastifyTRPCPlugin, {
  prefix: "/trpc",
  trpcOptions: { router: appRouter, createContext },
});

// No-ops when S3_LOG_BUCKET isn't set -- see log-archiver.ts's own comment.
startLogArchiver();

const port = Number(process.env.PORT ?? 3000);

server.listen({ port, host: "0.0.0.0" }).catch((err) => {
  server.log.error(err);
  process.exit(1);
});
