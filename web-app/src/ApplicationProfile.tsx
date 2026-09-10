import { useState } from "react";
import { Avatar, TextInput } from "@mantine/core";
import { IconCamera } from "@tabler/icons-react";
import { isAllowedAvatarFile } from "./AuthHelpers/avatar-rules";
import { authClient } from "./AuthHelpers/auth-client";
import { Button, ErrorMessage, PageHeader, Row, RowCard } from "./components";
import { trpc } from "./trpc";
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
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const name = draftName ?? session?.user.name ?? "";
  const isDirty = draftName !== null && draftName !== session?.user.name;
  // Uploaded avatar wins once set; Google's own profile picture (the
  // native `image` field) is the fallback until then.
  const avatarSrc = session?.user.avatarUrl ?? session?.user.image ?? undefined;

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

  async function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Always clear the input's own value, selected file or not -- without
    // this, picking the exact same file again wouldn't fire onChange a
    // second time.
    event.target.value = "";
    if (!file) return;

    const validationError = isAllowedAvatarFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setAvatarUploading(true);
    try {
      // contentType is already validated against the same allowlist the
      // server enforces (isAllowedAvatarFile above) -- safe to pass
      // file.type straight through, trpc/routers/profile.ts's own zod
      // schema is the real backstop either way.
      const { uploadUrl, key } = await trpc.profile.requestAvatarUpload.mutate({
        contentType: file.type as "image/jpeg" | "image/png" | "image/webp",
      });

      const putResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putResponse.ok) {
        throw new Error("Upload to storage failed.");
      }

      await trpc.profile.confirmAvatarUpload.mutate({ key });
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't upload that image.");
    } finally {
      setAvatarUploading(false);
    }
  }

  return (
    <PageHeader eyebrow="Profile" title="Profile">
      <div className={styles.identity}>
        <label className={styles.avatarWrap}>
          <Avatar src={avatarSrc} alt={session?.user.name} size={64} radius="xl" />
          <input
            className={styles.avatarInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label="Change profile photo"
            disabled={avatarUploading}
            onChange={(event) => void handleAvatarChange(event)}
          />
          <span className={styles.avatarOverlay}>
            {avatarUploading ? (
              <span className={styles.avatarOverlayLabel}>…</span>
            ) : (
              <IconCamera size={20} stroke={1.75} />
            )}
          </span>
        </label>
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
