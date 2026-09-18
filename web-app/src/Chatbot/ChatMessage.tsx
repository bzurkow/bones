import { Eyebrow, MarkdownViewer } from "../components";
import type { ChatUIMessage } from "./useChatStream";
import styles from "./Chatbot.module.css";

const TIME_FORMAT = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

export interface ChatMessageProps {
  message: ChatUIMessage;
}

// One bubble -- ink border, right-aligned for the user; muted border,
// left-aligned for the assistant (CLAUDE.md rule 3: borders, not shadows).
// Assistant text goes through the existing MarkdownViewer (already
// sanitized, see shared-ui) rather than a new renderer -- Claude/Qwen
// replies are prose, occasionally with lists/code, MarkdownViewer already
// handles that.
export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const showThinkingDot = !isUser && message.pending && message.content.length === 0;

  return (
    <div className={`${styles.messageRow} ${isUser ? styles.messageRowUser : ""}`}>
      <div
        className={`${styles.bubble} ${isUser ? styles.bubbleUser : styles.bubbleAssistant} ${message.failed ? styles.bubbleFailed : ""}`}
      >
        <Eyebrow>
          {isUser ? "You" : "Assistant"} · {TIME_FORMAT.format(message.createdAt)}
        </Eyebrow>
        {showThinkingDot ? (
          <span className={styles.thinkingDot} aria-label="Thinking" />
        ) : isUser ? (
          <p className={styles.userText}>{message.content}</p>
        ) : (
          <MarkdownViewer content={message.content} />
        )}
        {message.failed && <p className={styles.failedText}>Didn't finish -- try sending it again.</p>}
      </div>
    </div>
  );
}
