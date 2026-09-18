import { useEffect, useState } from "react";
import type { HTMLAttributes, KeyboardEvent } from "react";
import { isTRPCClientError } from "@trpc/client";
import { Virtuoso } from "react-virtuoso";
import { Button, ErrorMessage, Eyebrow } from "../components";
import { trpc } from "../trpc";
import { ChatMessage } from "./ChatMessage";
import { useChatStream, type ChatUIMessage } from "./useChatStream";
import styles from "./Chatbot.module.css";

type Organization = Awaited<ReturnType<typeof trpc.organizations.listForCurrentUser.query>>[number];
type History = Awaited<ReturnType<typeof trpc.chatbot.getHistory.query>>;

// The actual chat UI, mounted only once an organizationId and its
// starting history are known -- `key={organizationId}` on the call site
// forces a fresh mount (and so a fresh useChatStream) on every org switch,
// rather than juggling stale conversation state across orgs by hand.
function ChatThread({ organizationId, initialHistory }: { organizationId: string; initialHistory: History }) {
  const { messages, sending, error, send, startNewChat } = useChatStream(
    organizationId,
    initialHistory.conversationId,
    initialHistory.messages.map((message) => ({ ...message, createdAt: new Date(message.createdAt) })),
  );
  const [draft, setDraft] = useState("");

  function handleSend() {
    if (!draft.trim() || sending) return;
    void send(draft);
    setDraft("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      <div className={styles.headerRow}>
        <Eyebrow>{messages.length > 0 ? `Conversation · ${messages.length} messages` : "New conversation"}</Eyebrow>
        <Button variant="quiet" size="sm" onClick={startNewChat} disabled={sending || messages.length === 0}>
          New chat
        </Button>
      </div>

      <div className={styles.listWrap}>
        {messages.length === 0 ? (
          <div className={styles.emptyList}>Send a message to start.</div>
        ) : (
          <Virtuoso
            data={messages}
            followOutput="smooth"
            initialTopMostItemIndex={messages.length - 1}
            style={{ height: "100%" }}
            components={{ List: ListPadding }}
            itemContent={(_index, message: ChatUIMessage) => <ChatMessage message={message} />}
          />
        )}
      </div>

      <ErrorMessage message={error} />

      <div className={styles.composer}>
        <textarea
          className={styles.composerInput}
          placeholder="Message the chatbot…"
          rows={1}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
        />
        <div className={styles.composerActions}>
          <Button size="sm" onClick={handleSend} disabled={sending || !draft.trim()}>
            {sending ? "Sending…" : "Send"}
          </Button>
        </div>
      </div>
    </>
  );
}

// react-virtuoso's `components.List` override -- gives the scrollable
// content the same gap/padding the rest of the app gets from PageHeader's
// own container, since Virtuoso renders its own scroller/list wrapper
// rather than something this page controls directly.
function ListPadding(props: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={styles.listPadding} />;
}

type Phase = "loading" | "no-orgs" | "checking-access" | "denied" | "ready" | "load-error";

// `/` (App.tsx's index route) -- the chatbot, gated by the organization
// feature "chatbot" (organization-permissions.ts's CHATBOT_FEATURE_KEY).
// Resolves which organization applies from the caller's own memberships
// (trpc.organizations.listForCurrentUser, already powers
// OrganizationsIndex.tsx) rather than a route param -- there's no
// /organizations/:orgName segment here, this is the bare app home.
export function Chatbot() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [history, setHistory] = useState<History | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void trpc.organizations.listForCurrentUser
      .query()
      .then((result) => {
        if (cancelled) return;
        setOrgs(result);
        if (result.length === 0) {
          setPhase("no-orgs");
        } else {
          setSelectedOrgId(result[0]!.id);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : "Couldn't load your organizations.");
        setPhase("load-error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedOrgId) return;
    let cancelled = false;
    // oxlint-disable-next-line react/set-state-in-effect
    setPhase("checking-access");
    void trpc.chatbot.getHistory
      .query({ organizationId: selectedOrgId })
      .then((result) => {
        if (cancelled) return;
        setHistory(result);
        setPhase("ready");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // FORBIDDEN here means "not granted" -- the org's own admin has to
        // turn it on (organization-permissions.ts's CHATBOT_FEATURE_KEY),
        // not a real failure, so this doesn't go through ErrorMessage's
        // danger styling (CLAUDE.md rule 1 reserves that for actual
        // errors). Any other failure (network, 500) does.
        if (isTRPCClientError(err) && err.data?.code === "FORBIDDEN") {
          setPhase("denied");
        } else {
          setLoadError(err instanceof Error ? err.message : "Couldn't load the chatbot.");
          setPhase("load-error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedOrgId]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Eyebrow>Chatbot</Eyebrow>
        <div className={styles.headerRow}>
          <h1 className={styles.title}>Chatbot</h1>
          {orgs.length > 1 && (
            <div className={styles.orgPicker}>
              {orgs.map((org) => (
                <button
                  key={org.id}
                  type="button"
                  className={`${styles.orgOption} ${org.id === selectedOrgId ? styles.orgOptionActive : ""}`}
                  onClick={() => setSelectedOrgId(org.id)}
                >
                  {org.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {phase === "loading" || phase === "checking-access" ? null : phase === "no-orgs" ? (
        <p className={styles.centeredNote}>You're not part of an organization yet.</p>
      ) : phase === "denied" ? (
        <p className={styles.centeredNote}>Ask an admin to enable this in your organization's settings.</p>
      ) : phase === "load-error" ? (
        <ErrorMessage message={loadError} />
      ) : (
        selectedOrgId &&
        history && <ChatThread key={selectedOrgId} organizationId={selectedOrgId} initialHistory={history} />
      )}
    </div>
  );
}
