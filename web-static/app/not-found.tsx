"use client";

import Link from "next/link";
import { BrandLockup, Button, ConfusedIcon } from "shared-ui";
import styles from "./not-found.module.css";

// Next's App Router convention: this file replaces the framework's default
// 404 for any unmatched route. Mirrors web-app/src/NotFound.tsx (same
// copy, same ConfusedIcon/BrandLockup/Button) adapted for next/link
// instead of react-router's Link -- "/" is this site's only real route so
// far, but stays a safe destination regardless.
export default function NotFound() {
  return (
    <div className={styles.page}>
      <Link href="/" className={styles.brand}>
        <BrandLockup />
      </Link>

      <div className={styles.center}>
        <div className={styles.card}>
          <ConfusedIcon size={88} />
          <h1 className={styles.heading}>Page not found</h1>
          <p className={styles.body}>The page you're looking for doesn't exist or has moved.</p>
          <Button component={Link} href="/">
            Back to Bones
          </Button>
        </div>
      </div>
    </div>
  );
}
