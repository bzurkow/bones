import type { ElementType, ReactNode } from "react";
import { BrandLockup } from "../BrandLockup";
import styles from "./AuthPageShell.module.css";

// web-app's four auth pages (Login, SignUp, ForgotPassword, ResetPassword)
// shared this exact page shell -- byte-identical .page/.brand/.center/.card/
// .heading/.footer CSS in every one of them, and identical footer copy too.
// Same polymorphic-Link problem NotFoundPage already solved (a router's own
// Link component, plus whatever props it needs to point at "/"), kept here
// rather than hardcoding react-router's -- web-static has no auth pages of
// its own yet, but there's no reason this couldn't move there too.
//
// Deliberately does NOT render ColorSchemeToggle itself -- same precedent as
// NotFoundPage, which leaves that to each app's own thin wrapper (web-app's
// NotFound.tsx renders it as a sibling, not inside NotFoundPage). Each auth
// page keeps doing the same.
export interface AuthPageShellProps {
  linkComponent: ElementType;
  linkProps: Record<string, unknown>;
  heading: string;
  children: ReactNode;
}

export function AuthPageShell({ linkComponent: LinkComponent, linkProps, heading, children }: AuthPageShellProps) {
  return (
    <div className={styles.page}>
      <LinkComponent className={styles.brand} {...linkProps}>
        <BrandLockup />
      </LinkComponent>

      <div className={styles.center}>
        <div className={styles.card}>
          <h1 className={styles.heading}>{heading}</h1>
          {children}
        </div>
      </div>

      <div className={styles.footer}>
        <span>© 2026 Bones</span>
      </div>
    </div>
  );
}
