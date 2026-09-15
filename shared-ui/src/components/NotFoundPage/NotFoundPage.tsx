import type { ElementType } from "react";
import { BrandLockup } from "../BrandLockup";
import { Button } from "../Button";
import { ConfusedIcon } from "../ConfusedIcon";
import styles from "./NotFoundPage.module.css";

// Was two byte-for-byte identical copies (web-app's NotFound.tsx, both TSX
// and CSS, and web-static's not-found.tsx) differing only in which Link
// component the app's router provides -- react-router's Link vs. next/link's
// Link. Same polymorphic-component problem Button.tsx already solves via
// Mantine's `component` prop, so this takes the same shape: the caller
// passes its own Link component plus whatever props that Link needs to
// point at "/", and NotFoundPage renders it in both places (the brand
// lockup and the CTA button) without knowing which router it is.
//
// linkProps is untyped (Record<string, unknown>) for the same reason
// Button's own `to`/`href` are loosely typed rather than chased into full
// generic polymorphism -- react-router's Link wants `to`, next/link wants
// `href`, and there's no single prop name both agree on.
export interface NotFoundPageProps {
  linkComponent: ElementType;
  linkProps: Record<string, unknown>;
}

export function NotFoundPage({ linkComponent: LinkComponent, linkProps }: NotFoundPageProps) {
  return (
    <div className={styles.page}>
      <LinkComponent className={styles.brand} {...linkProps}>
        <BrandLockup />
      </LinkComponent>

      <div className={styles.center}>
        <div className={styles.card}>
          <ConfusedIcon size={88} />
          <h1 className={styles.heading}>Page not found</h1>
          <p className={styles.body}>The page you're looking for doesn't exist or has moved.</p>
          <Button component={LinkComponent} {...linkProps}>
            Back to Bones
          </Button>
        </div>
      </div>
    </div>
  );
}
