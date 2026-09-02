import { useState } from "react";
import { Switch } from "@mantine/core";
import { authClient } from "./AuthHelpers/auth-client";
import { getViewSettings, type ViewSettings } from "./AuthHelpers/viewSettings";
import { Eyebrow } from "./components";
import { trpc } from "./trpc";
import styles from "./ApplicationSettings.module.css";

export function ApplicationSettings() {
  const { data: session, refetch } = authClient.useSession();
  const settings = getViewSettings(session?.user);

  // Session is the source of truth; this only covers the gap between
  // flipping a switch and refetch() below confirming it saved -- cleared
  // either way once that resolves, so it never drifts from the session.
  const [optimistic, setOptimistic] = useState<Partial<ViewSettings> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inheritViewModeFromBrowser =
    optimistic?.inheritViewModeFromBrowser ?? settings.inheritViewModeFromBrowser;
  const viewMode = optimistic?.viewMode ?? settings.viewMode;

  async function updateSettings(input: Partial<ViewSettings>) {
    setError(null);
    setOptimistic({ inheritViewModeFromBrowser, viewMode, ...input });
    try {
      await trpc.userSettings.updateUserSettings.mutate(input);
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that change.");
    } finally {
      setOptimistic(null);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Eyebrow>Settings</Eyebrow>
        <h1 className={styles.title}>Settings</h1>
      </div>

      <div className={styles.card}>
        <div className={styles.row}>
          <div className={styles.rowText}>
            <span className={styles.rowLabel}>Inherit view mode from browser</span>
            <span className={styles.rowDescription}>
              Follow your operating system's light/dark preference automatically.
            </span>
          </div>
          <Switch
            aria-label="Inherit view mode from browser"
            checked={inheritViewModeFromBrowser}
            onChange={(event) =>
              void updateSettings({ inheritViewModeFromBrowser: event.currentTarget.checked })
            }
          />
        </div>

        <div className={styles.row}>
          <div className={styles.rowText}>
            <span className={styles.rowLabel}>Dark mode</span>
            <span className={styles.rowDescription}>
              Only applies when not inheriting from your browser.
            </span>
          </div>
          <Switch
            aria-label="Dark mode"
            checked={viewMode === "dark"}
            disabled={inheritViewModeFromBrowser}
            onChange={(event) =>
              void updateSettings({ viewMode: event.currentTarget.checked ? "dark" : "light" })
            }
          />
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
