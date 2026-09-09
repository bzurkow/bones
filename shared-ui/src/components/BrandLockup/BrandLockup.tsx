import { BonesMark } from "../BonesMark";
import styles from "./BrandLockup.module.css";

export type BrandLockupSize = "sm" | "md";

const ICON_SIZE: Record<BrandLockupSize, number> = { sm: 22, md: 24 };

export interface BrandLockupProps {
  size?: BrandLockupSize;
}

// The BonesMark + "Bones" wordmark pairing -- previously copy-pasted
// identically (JSX and CSS both) into six separate files across both
// apps: web-app's Login/NotFound/TermsAndConditions/TopBar, web-static's
// not-found page and the landing page's own header. "sm" matches
// TopBar's nav-bar context (22px icon, 17.5px wordmark); "md" (default)
// is every full-page/hero context (24px icon, 19px wordmark).
//
// Deliberately NOT a link/anchor itself -- callers wrap it in whatever's
// appropriate for their context (react-router's Link, Next's Link, a
// plain <a>, or nothing at all -- TermsAndConditions.tsx's gate page
// keeps it non-interactive on purpose, since navigating away isn't the
// intended action there).
export function BrandLockup({ size = "md" }: BrandLockupProps) {
  return (
    <div className={`${styles.lockup} ${styles[size]}`}>
      <BonesMark size={ICON_SIZE[size]} />
      <span className={styles.wordmark}>Bones</span>
    </div>
  );
}
