import { useEffect, useState } from "react";
import { Switch } from "@mantine/core";
import type { AuthProtocolName } from "backend";
import { authClient } from "../AuthHelpers/auth-client";
import { hasFeature } from "../AuthHelpers/permissions";
import { ErrorMessage, Row, RowCard } from "../components";
import { trpc } from "../trpc";
import styles from "./AdminPanel.module.css";

type AuthProtocol = Awaited<ReturnType<typeof trpc.authProtocols.list.query>>[number];

// Presentational labels/descriptions only -- Login.tsx/SignUp.tsx don't
// need these, they only read the boolean. Keyed by AuthProtocolName so a
// protocol added to backend/src/auth-protocols.ts without a matching entry
// here is a type error, not a silently blank row.
const PROTOCOL_INFO: Record<AuthProtocolName, { label: string; description: string }> = {
  email: { label: "Email and password", description: "Sign up and sign in with an email address and password." },
  google: { label: "Google", description: "Sign up and sign in with a Google account." },
};

export function AdminSiteSettings() {
  const { data: session } = authClient.useSession();
  // Section-level, on top of page.admin.site-settings (getting to this page
  // at all) -- same layering as AdminUsers.tsx's canUpdateRole/etc. A role
  // without this (e.g. "standard", if it ever reached this page) just
  // doesn't see the section, same treatment as a hidden nav item.
  const canView = hasFeature(session?.enabledFeatures, "admin.auth-protocols.view");
  const canUpdate = hasFeature(session?.enabledFeatures, "admin.auth-protocols.update");
  const [protocols, setProtocols] = useState<AuthProtocol[] | undefined>(undefined);
  const [updatingName, setUpdatingName] = useState<AuthProtocolName | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setProtocols(await trpc.authProtocols.list.query());
  }

  useEffect(() => {
    // Gated on canView -- list itself is public (Login.tsx/SignUp.tsx call
    // it with no session at all), but there's no reason for this page to
    // fetch it for a role that won't render the section anyway. Same
    // legitimate fetch-on-mount case AdminTerms.tsx's own load() effect
    // documents -- see that file's comment.
    if (!canView) return;
    // oxlint-disable-next-line react/set-state-in-effect
    void load();
  }, [canView]);

  async function handleToggle(protocol: AuthProtocol, enabled: boolean) {
    setError(null);
    setUpdatingName(protocol.name);
    try {
      await trpc.authProtocols.setEnabled.mutate({ name: protocol.name, enabled });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update that sign-in method.");
    } finally {
      setUpdatingName(null);
    }
  }

  return (
    <div className={styles.stack}>
      <p className={styles.body}>Site-wide configuration -- name, branding, feature flags -- will live here.</p>

      {canView && (
        <section>
          <h2 className={styles.sectionTitle}>Authorization Protocols</h2>
          <p className={styles.sectionDescription}>
            Which sign-up and sign-in methods are available. Disabling one also hides it from the sign-in and sign-up
            pages.
          </p>

          {protocols && (
            <RowCard>
              {protocols.map((protocol) => (
                <Row
                  key={protocol.name}
                  label={PROTOCOL_INFO[protocol.name].label}
                  description={PROTOCOL_INFO[protocol.name].description}
                >
                  <Switch
                    aria-label={PROTOCOL_INFO[protocol.name].label}
                    checked={protocol.enabled}
                    // Same plain-disabled treatment as AdminUsers.tsx's
                    // canUpdateRole/canUpdateStatus -- a view-only role (e.g.
                    // "demo") sees the switches, just can't flip them.
                    disabled={!canUpdate || updatingName === protocol.name}
                    onChange={(event) => void handleToggle(protocol, event.currentTarget.checked)}
                  />
                </Row>
              ))}
            </RowCard>
          )}

          <ErrorMessage message={error} />
        </section>
      )}
    </div>
  );
}
