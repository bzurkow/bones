import { afterEach, describe, expect, it, vi } from "vitest";
import { bedrockProvider } from "./bedrock-provider.js";
import { getChatProvider, setChatProviderForTests } from "./index.js";
import { ollamaProvider } from "./ollama-provider.js";

describe("getChatProvider", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    setChatProviderForTests(null);
  });

  it("defaults to ollama when CHAT_PROVIDER is unset", () => {
    vi.stubEnv("CHAT_PROVIDER", undefined);
    expect(getChatProvider()).toBe(ollamaProvider);
  });

  it("picks ollama explicitly", () => {
    vi.stubEnv("CHAT_PROVIDER", "ollama");
    expect(getChatProvider()).toBe(ollamaProvider);
  });

  it("picks bedrock explicitly", () => {
    vi.stubEnv("CHAT_PROVIDER", "bedrock");
    expect(getChatProvider()).toBe(bedrockProvider);
  });

  it("throws on an unrecognized value rather than silently falling back", () => {
    vi.stubEnv("CHAT_PROVIDER", "openai");
    expect(() => getChatProvider()).toThrow(/Unknown CHAT_PROVIDER/);
  });

  it("a test override takes precedence over CHAT_PROVIDER", () => {
    vi.stubEnv("CHAT_PROVIDER", "bedrock");
    const stub = { streamReply: async function* () {} };
    setChatProviderForTests(stub);
    expect(getChatProvider()).toBe(stub);
  });
});
