import { Link } from "react-router-dom";
import { BonesMark, Button, ConfusedIcon } from "./components";
import styles from "./NotFound.module.css";

// Catch-all for any route that doesn't match -- wired in App.tsx as
// path="*", the last route in the tree. "/" is always a safe destination
// regardless of auth state: RequireAuth redirects to /welcome on its own
// if there's no session.
export function NotFound() {
  return (
    <div className={styles.page}>
      <Link to="/" className={styles.brand}>
        <BonesMark size={24} />
        <span className={styles.wordmark}>Bones</span>
      </Link>

      <div className={styles.center}>
        <div className={styles.card}>
          <ConfusedIcon size={88} />
          <h1 className={styles.heading}>Page not found</h1>
          <p className={styles.body}>The page you're looking for doesn't exist or has moved.</p>
          <Button component={Link} to="/">
            Back to Bones
          </Button>
        </div>
      </div>
    </div>
  );
}
