import { AnthropicBedrockMantle } from "@anthropic-ai/bedrock-sdk";
import { CHAT_SYSTEM_PROMPT, type ChatMessage, type ChatProvider } from "./provider.js";

// Prod's chat backend -- real Claude via Amazon Bedrock. AnthropicBedrockMantle
// exposes the same `.messages` surface as the plain Anthropic SDK (it's a
// BaseAnthropic subclass, see @anthropic-ai/bedrock-sdk's own
// mantle-client.d.ts), just SigV4-signed against Bedrock instead of hitting
// api.anthropic.com directly -- so this reads like any other Claude
// integration, not bespoke AWS SDK plumbing. Credentials/region resolve the
// same way storage/index.ts's S3Client and email/index.ts's SESv2Client
// already do (AWS_REGION/AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY from the
// environment, or the default AWS credential chain in a real deployment
// with an IAM role attached instead of static keys).
const client = new AnthropicBedrockMantle({ awsRegion: process.env.AWS_REGION });

// Bedrock's own id format for Claude models takes an "anthropic." prefix
// (see the Claude API skill's Provider Clients reference). Opus 5 is the
// current default per that same skill ("always use claude-opus-5 unless
// told otherwise") -- overridable via env if a cheaper/faster model turns
// out to suit a plain chat feature better once this is actually in use.
const modelId = process.env.BEDROCK_MODEL_ID ?? "anthropic.claude-opus-5";

// A chat reply doesn't need anywhere near Claude's full 64K output ceiling
// -- capped well below it so a stuck/looping generation can't run up an
// unbounded bill on one turn.
const MAX_TOKENS = 4096;

export const bedrockProvider: ChatProvider = {
  async *streamReply(history: ChatMessage[]) {
    const stream = client.messages.stream({
      model: modelId,
      max_tokens: MAX_TOKENS,
      system: CHAT_SYSTEM_PROMPT,
      messages: history.map((message) => ({ role: message.role, content: message.content })),
    });

    // MessageStream is itself an AsyncIterable<MessageStreamEvent> (see
    // @anthropic-ai/sdk's lib/MessageStream.d.ts) -- iterating it directly
    // and filtering for text deltas needs nothing beyond what the SDK
    // already exports, no `.on('text', ...)` callback-to-async-iterator
    // adapter of our own.
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield event.delta.text;
      }
    }
  },
};
