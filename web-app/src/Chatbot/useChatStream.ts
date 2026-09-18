import { useState } from "react";
import { BACKEND_URL } from "../config";

export interface ChatUIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
  // Still streaming in (assistant only) -- ChatMessageList uses this to
  // show the "thinking" dot until the first delta arrives, and to mark a
  // message that stopped mid-stream as failed rather than a normal reply.
  pending?: boolean;
  failed?: boolean;
}

type StreamEvent =
  | { type: "delta"; text: string }
  | { type: "done"; conversationId: string; messageId: string }
  | { type: "error"; message: string };

// POST /chatbot/stream (backend/src/index.ts) isn't a tRPC procedure --
// there's no WebSocket/subscription transport wired up in this app, so a
// plain `fetch()` + `ReadableStream` reader is how the client reads a
// chunked, token-by-token reply. Newline-delimited JSON, not
// `text/event-stream`/`EventSource` -- EventSource is GET-only and can't
// carry the POST body this route needs (organizationId/conversationId/
// content), so there's nothing this hook could hand off to it anyway.
export function useChatStream(
  organizationId: string,
  initialConversationId: string | null,
  initialMessages: ChatUIMessage[],
) {
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [messages, setMessages] = useState(initialMessages);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startNewChat() {
    if (sending) return;
    setConversationId(null);
    setMessages([]);
    setError(null);
  }

  async function send(content: string) {
    const trimmed = content.trim();
    if (!trimmed || sending) return;

    setError(null);
    setSending(true);

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: trimmed, createdAt: new Date() },
      { id: assistantId, role: "assistant", content: "", createdAt: new Date(), pending: true },
    ]);

    // Flushed to state on a short throttle, not on every single delta --
    // react-virtuoso already virtualizes the list, this is what keeps the
    // *last* (growing) bubble cheap to re-render too, the other half of
    // the "performant" ask.
    let accumulated = "";
    let flushScheduled = false;
    function flush() {
      flushScheduled = false;
      setMessages((prev) =>
        prev.map((message) => (message.id === assistantId ? { ...message, content: accumulated } : message)),
      );
    }
    function scheduleFlush() {
      if (flushScheduled) return;
      flushScheduled = true;
      requestAnimationFrame(flush);
    }

    try {
      const response = await fetch(`${BACKEND_URL}/chatbot/stream`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ organizationId, conversationId, content: trimmed }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `The chatbot didn't respond (${response.status}).`);
      }
      if (!response.body) throw new Error("The chatbot didn't respond.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let sawDone = false;

      // Same manual newline-buffering shape backend/src/lib/chat/
      // ollama-provider.ts uses on its own side of an equivalent problem
      // -- a network chunk boundary has no reason to line up with a JSON
      // line boundary.
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newlineIndex = buffer.indexOf("\n");
        while (newlineIndex !== -1) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);
          newlineIndex = buffer.indexOf("\n");
          if (!line) continue;

          const event = JSON.parse(line) as StreamEvent;
          if (event.type === "delta") {
            accumulated += event.text;
            scheduleFlush();
          } else if (event.type === "done") {
            sawDone = true;
            setConversationId(event.conversationId);
            setMessages((prev) =>
              prev.map((message) =>
                message.id === assistantId ? { ...message, content: accumulated, pending: false } : message,
              ),
            );
          } else {
            throw new Error(event.message);
          }
        }
      }

      if (!sawDone) {
        // The connection ended without a "done" line (e.g. the server
        // dropped) -- keep whatever text already arrived, just stop
        // treating it as still-streaming.
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantId ? { ...message, content: accumulated, pending: false } : message,
          ),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantId ? { ...message, content: accumulated, pending: false, failed: true } : message,
        ),
      );
    } finally {
      setSending(false);
    }
  }

  return { conversationId, messages, sending, error, send, startNewChat };
}
