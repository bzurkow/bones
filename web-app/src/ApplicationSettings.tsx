import { useState } from "react";
import { Switch } from "@mantine/core";
import type { ViewMode } from "backend";
import { authClient } from "./AuthHelpers/auth-client";
import { ErrorMessage, PageHeader, Row, RowCard } from "./components";
import { trpc } from "./trpc";

interface ViewSettingsInput {
  inheritViewModeFromBrowser?: boolean;
  viewMode?: ViewMode;
}

export function ApplicationSettings() {
  const { data: session, refetch } = authClient.useSession();

  // Session is the source of truth; this only covers the gap between
  // flipping a switch and refetch() below confirming it saved -- cleared
  // either way once that resolves, so it never drifts from the session.
  const [optimistic, setOptimistic] = useState<ViewSettingsInput | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The ?? fallbacks only matter for the brief window before session
  // loads -- once it has, these fields are always present (required: true
  // in auth.ts).
  const inheritViewModeFromBrowser =
    optimistic?.inheritViewModeFromBrowser ?? session?.user.inheritViewModeFromBrowser ?? true;
  const viewMode = optimistic?.viewMode ?? session?.user.viewMode ?? "light";

  async function updateSettings(input: ViewSettingsInput) {
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
    <PageHeader eyebrow="Settings" title="Settings">
      <RowCard>
        <Row
          label="Inherit view mode from browser"
          description="Follow your operating system's light/dark preference automatically."
        >
          <Switch
            aria-label="Inherit view mode from browser"
            checked={inheritViewModeFromBrowser}
            onChange={(event) =>
              void updateSettings({ inheritViewModeFromBrowser: event.currentTarget.checked })
            }
          />
        </Row>

        <Row label="Dark mode" description="Only applies when not inheriting from your browser.">
          <Switch
            aria-label="Dark mode"
            checked={viewMode === "dark"}
            disabled={inheritViewModeFromBrowser}
            onChange={(event) =>
              void updateSettings({ viewMode: event.currentTarget.checked ? "dark" : "light" })
            }
          />
        </Row>
      </RowCard>

      <ErrorMessage message={error} />
    </PageHeader>
  );
}
