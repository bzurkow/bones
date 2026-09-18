import { CHAT_SYSTEM_PROMPT, type ChatMessage, type ChatProvider } from "./provider.js";

// Dev's chat backend -- a local Ollama server (docker-compose.dev.yml's
// new "ollama" service) running Qwen, not literally the Bedrock SDK: there
// is no way to point AnthropicBedrockMantle at anything but real AWS
// Bedrock (SigV4-signed, fixed endpoint shape), so this talks to Ollama's
// own native /api/chat instead -- same ChatProvider interface as
// bedrock-provider.ts, so index.ts's /chatbot/stream route can't tell
// which one is actually running.
const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const model = process.env.OLLAMA_MODEL ?? "qwen2.5:7b";

interface OllamaChatChunk {
  message?: { role: string; content: string };
  done: boolean;
  error?: string;
}

export const ollamaProvider: ChatProvider = {
  async *streamReply(history: ChatMessage[]) {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model,
        stream: true,
        messages: [{ role: "system", content: CHAT_SYSTEM_PROMPT }, ...history],
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Ollama request failed (${response.status}): ${await response.text().catch(() => "")}`);
    }

    // Ollama's own streaming format -- one JSON object per line, not SSE
    // and not the Anthropic event shape bedrock-provider.ts consumes.
    // Buffered manually since a chunk boundary from the network has no
    // reason to line up with a JSON-line boundary.
    const decoder = new TextDecoder();
    let buffer = "";
    for await (const chunk of response.body) {
      buffer += decoder.decode(chunk as Uint8Array, { stream: true });
      let newlineIndex = buffer.indexOf("\n");
      while (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        newlineIndex = buffer.indexOf("\n");
        if (!line) continue;

        const parsed = JSON.parse(line) as OllamaChatChunk;
        if (parsed.error) throw new Error(parsed.error);
        if (parsed.message?.content) yield parsed.message.content;
        if (parsed.done) return;
      }
    }
  },
};
