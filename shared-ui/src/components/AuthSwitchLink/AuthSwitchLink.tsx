import type { ElementType, ReactNode } from "react";
import styles from "./AuthSwitchLink.module.css";

// The centered, mono, muted-until-hover nav link every auth page ends on
// ("Don't have an account? Create one", "Back to sign in", ...). Same
// polymorphic-Link shape as AuthPageShell/NotFoundPage -- only react-router's
// Link is a real consumer today (web-static has no auth pages yet), but kept
// consistent with the other two rather than hardcoding it.
export interface AuthSwitchLinkProps {
  linkComponent: ElementType;
  linkProps: Record<string, unknown>;
  children: ReactNode;
}

export function AuthSwitchLink({ linkComponent: LinkComponent, linkProps, children }: AuthSwitchLinkProps) {
  return (
    <LinkComponent className={styles.switchLink} {...linkProps}>
      {children}
    </LinkComponent>
  );
}
