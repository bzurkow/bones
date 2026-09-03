import { useState } from "react";
import { Avatar, TextInput } from "@mantine/core";
import { authClient } from "./AuthHelpers/auth-client";
import { Button, ErrorMessage, PageHeader, Row, RowCard } from "./components";
import styles from "./ApplicationProfile.module.css";

const ROLE_LABELS = {
  owner: "Owner",
  administrator: "Administrator",
  standard: "Standard",
  demo: "Demo",
} as const;

export function ApplicationProfile() {
  const { data: session, refetch } = authClient.useSession();

  // Session is the source of truth; draftName only holds an in-progress
  // edit, cleared once a save actually lands (mirrors the pattern in
  // ApplicationSettings.tsx).
  const [draftName, setDraftName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const name = draftName ?? session?.user.name ?? "";
  const isDirty = draftName !== null && draftName !== session?.user.name;

  async function handleSave() {
    if (!isDirty || draftName === null) return;
    setSaving(true);
    setError(null);
    // better-auth's own updateUser, not our tRPC router -- name/image are
    // plain self-service fields (unlike role/viewMode, which are
    // input: false in auth.ts specifically to keep them off this path).
    const { error: updateError } = await authClient.updateUser({ name: draftName });
    if (updateError) {
      setError(updateError.message ?? "Couldn't save that change.");
    } else {
      await refetch();
      setDraftName(null);
    }
    setSaving(false);
  }

  return (
    <PageHeader eyebrow="Profile" title="Profile">
      <div className={styles.identity}>
        <Avatar src={session?.user.image ?? undefined} alt={session?.user.name} size={64} radius="xl" />
        <div className={styles.identityFields}>
          <TextInput
            aria-label="Name"
            value={name}
            disabled={saving}
            onChange={(event) => setDraftName(event.currentTarget.value)}
          />
          <span className={styles.email}>{session?.user.email}</span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          disabled={!isDirty || saving}
          onClick={() => void handleSave()}
        >
          Save
        </Button>
      </div>

      <RowCard>
        <Row label="Role">
          <span className={styles.status}>
            <span className={styles.statusDot} />
            {session ? ROLE_LABELS[session.user.role] : ""}
          </span>
        </Row>
        <Row label="Member since">
          <span className={styles.mono}>
            {session
              ? new Date(session.user.createdAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : ""}
          </span>
        </Row>
      </RowCard>

      <ErrorMessage message={error} />
    </PageHeader>
  );
}
