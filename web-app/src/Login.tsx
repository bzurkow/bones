import { useLocation } from "react-router-dom";
import type { Location } from "react-router-dom";
import { authClient } from "./AuthHelpers/auth-client";
import { BonesMark, Button } from "./components";
import styles from "./Login.module.css";

export function Login() {
  const { refetch } = authClient.useSession();
  const location = useLocation();
  const from = (location.state as { from?: Location } | null)?.from;

  async function handleSignIn() {
    const target = from ? `${from.pathname}${from.search}` : "/";
    await authClient.signIn.social({
      provider: "google",
      callbackURL: `${window.location.origin}${target}`,
    });
    await refetch();
  }

  return (
    <div className={styles.page}>
      <a href="/" className={styles.brand}>
        <BonesMark size={24} />
        <span className={styles.wordmark}>Bones</span>
      </a>

      <div className={styles.center}>
        <div className={styles.card}>
          <h1 className={styles.heading}>Sign in to Bones</h1>
          {/* Text only, no logo -- CLAUDE.md rule 8: "No third-party brand
              logos. 'Continue with Google' is text. Keeps the page
              monochrome and sidesteps logo-usage terms." */}
          <Button variant="quiet" fullWidth onClick={handleSignIn}>
            Continue with Google
          </Button>
        </div>
      </div>

      <div className={styles.footer}>
        <span>© 2026 Bones</span>
      </div>
    </div>
  );
}
