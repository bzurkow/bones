import { bedrockProvider } from "./bedrock-provider.js";
import { ollamaProvider } from "./ollama-provider.js";
import type { ChatProvider } from "./provider.js";

export type { ChatMessage, ChatProvider } from "./provider.js";

// Same "swap by env var" shape email/index.ts (Mailpit vs SES) and
// storage/index.ts (RustFS vs real S3) already use for dev-vs-prod infra --
// CHAT_PROVIDER defaults to "ollama" (this repo's dev docker-compose
// always sets it explicitly too, but a bare `yarn dev` outside Docker
// should still fail toward the free local option, not an AWS call that
// needs real credentials).
const providers: Record<string, ChatProvider> = {
  bedrock: bedrockProvider,
  ollama: ollamaProvider,
};

// Overridable for tests (chatbot.test.ts injects a stub here instead of
// hitting a real model) -- reassigned, not just read once at module load,
// so a test's `afterEach` can restore it cleanly.
let override: ChatProvider | null = null;

export function getChatProvider(): ChatProvider {
  if (override) return override;
  const key = process.env.CHAT_PROVIDER ?? "ollama";
  const provider = providers[key];
  if (!provider) {
    throw new Error(`Unknown CHAT_PROVIDER "${key}" -- expected "bedrock" or "ollama".`);
  }
  return provider;
}

export function setChatProviderForTests(provider: ChatProvider | null): void {
  override = provider;
}
