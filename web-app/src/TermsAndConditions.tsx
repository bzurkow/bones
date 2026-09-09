import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authClient } from "./AuthHelpers/auth-client";
import { BonesMark, Button, ErrorMessage, MarkdownViewer } from "./components";
import { trpc } from "./trpc";
import styles from "./TermsAndConditions.module.css";

interface Terms {
  id: string;
  content: string;
}

// Full-page gate, not nested in AuthenticatedLayout -- see that file's
// comment for why (avoids a self-redirect loop, and this shouldn't have
// the normal TopBar/nav chrome tempting a user who hasn't accepted yet
// toward other pages). A "Log out" escape hatch is deliberately included
// even though it wasn't explicitly asked for -- without one, a user who
// doesn't want to accept would otherwise be stuck with literally no way
// off this page.
export function TermsAndConditions() {
  const { data: session, refetch } = authClient.useSession();
  const navigate = useNavigate();
  const [terms, setTerms] = useState<Terms | null | undefined>(undefined);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void trpc.termsAndConditions.get.query().then(setTerms);
  }, []);

  // Nothing active to accept, or already accepted (e.g. reached this page
  // directly by URL) -- nothing to do here either way, bounce back to the
  // app rather than trap the user on an empty/redundant gate.
  useEffect(() => {
    if (terms === null || session?.hasAcceptedTermsAndConditions === true) {
      navigate("/", { replace: true });
    }
  }, [terms, session, navigate]);

  useEffect(() => {
    function handleScroll() {
      const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 24;
      if (nearBottom) setScrolledToBottom(true);
    }
    window.addEventListener("scroll", handleScroll);
    // Content short enough to not need scrolling at all still counts.
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [terms]);

  async function accept() {
    if (!terms) return;
    setAccepting(true);
    setError(null);
    try {
      await trpc.termsAndConditions.accept.mutate({ termsAndConditionsId: terms.id });
      await refetch();
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't record your acceptance.");
    } finally {
      setAccepting(false);
    }
  }

  async function handleLogout() {
    await authClient.signOut();
    navigate("/login", { replace: true });
  }

  if (!terms) return null;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.brand}>
          <BonesMark size={24} />
          <span className={styles.wordmark}>Bones</span>
        </div>
        <button type="button" className={styles.logout} onClick={() => void handleLogout()}>
          Log out
        </button>
      </div>

      <div className={styles.content}>
        <h1 className={styles.heading}>Terms &amp; Conditions</h1>
        <p className={styles.prompt}>Please accept our terms and conditions before proceeding.</p>
        <MarkdownViewer content={terms.content} />
      </div>

      <div className={styles.actionBar}>
        <Button onClick={() => void accept()} disabled={!scrolledToBottom} loading={accepting}>
          Accept
        </Button>
        {!scrolledToBottom && <span className={styles.hint}>Scroll to the bottom to continue.</span>}
        <ErrorMessage message={error} />
      </div>
    </div>
  );
}
