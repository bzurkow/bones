// The one shape every chat backend has to satisfy -- dev's local Qwen
// model (ollama-provider.ts) and prod's Claude-on-Bedrock (bedrock-provider.ts)
// are otherwise unrelated SDKs/wire formats, but index.ts's /chatbot/stream
// route only ever talks to this interface, so which one is actually
// running is a config concern (see index.ts's own getChatProvider), not
// something that route needs to know about.
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatProvider {
  // Yields text deltas as they arrive -- the caller (index.ts's
  // /chatbot/stream route) is responsible for accumulating them into the
  // full reply and persisting it once the iterable completes. `history`
  // is the full prior conversation, oldest first, caller's new message
  // already appended as the last entry -- providers are stateless between
  // calls, same "resend the whole conversation" shape the Claude API
  // itself uses.
  streamReply(history: ChatMessage[]): AsyncIterable<string>;
}

// Same system prompt regardless of which provider is actually running --
// keeps dev (Qwen) and prod (Claude) behavior comparable rather than
// drifting into two different personas. Deliberately short and generic;
// nothing here is organization-specific yet.
export const CHAT_SYSTEM_PROMPT =
  "You are the assistant built into Bones. Be concise and direct. Format with " +
  "markdown when it helps (lists, code blocks), not by default.";
