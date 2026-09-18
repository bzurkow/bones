import { useState } from "react";
import { Avatar, TextInput } from "@mantine/core";
import { IconCamera } from "@tabler/icons-react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { isAllowedAvatarFile } from "../AuthHelpers/avatar-rules";
import { Button, ErrorMessage, Row, RowCard } from "../components";
import { trpc } from "../trpc";
import type { OrganizationOutletContext } from "./OrganizationLayout";
import styles from "./OrganizationProfile.module.css";

// The Profile tab -- looks a bit like ApplicationProfile.tsx on purpose
// (avatar + identity fields + a RowCard of status info). Membership lives
// on its own Members tab now (OrganizationMembers.tsx), Roles/Permissions
// on their own too -- this tab is just the org's own name/blurb/avatar/
// active state. org/refetchOrg come from OrganizationLayout.tsx's Outlet
// context, not a fetch of its own. Gated by org.canUpdateProfile, not the
// old blanket canEdit -- every tab has its own update permission now (see
// organization-permissions.ts's ORGANIZATION_TAB_UPDATE_FEATURES).
export function OrganizationProfile() {
  const { org, refetchOrg } = useOutletContext<OrganizationOutletContext>();
  const navigate = useNavigate();
  const canEdit = org.canUpdateProfile;

  const [draftName, setDraftName] = useState<string | null>(null);
  const [draftBlurb, setDraftBlurb] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const name = draftName ?? org.name;
  const blurb = draftBlurb ?? org.blurb;
  const isDirty = (draftName !== null && draftName !== org.name) || (draftBlurb !== null && draftBlurb !== org.blurb);

  async function handleSave() {
    if (!isDirty) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await trpc.organizations.update.mutate({
        organizationId: org.id,
        name: name.trim(),
        blurb: blurb.trim(),
      });
      setDraftName(null);
      setDraftBlurb(null);
      if (updated!.name !== org.name) {
        // Layout re-fetches by name off the URL param -- navigate first
        // so that param (and the fetch it triggers) already matches the
        // new name, rather than refetchOrg() briefly resolving the *old*
        // name against data that's already changed.
        navigate(`/organizations/${encodeURIComponent(updated!.name)}/profile`, { replace: true });
      } else {
        await refetchOrg();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that change.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
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
      const { uploadUrl, key } = await trpc.organizations.requestAvatarUpload.mutate({
        organizationId: org.id,
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

      await trpc.organizations.confirmAvatarUpload.mutate({ organizationId: org.id, key });
      await refetchOrg();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't upload that image.");
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleToggleActive() {
    setError(null);
    setTogglingActive(true);
    try {
      await trpc.organizations.setActive.mutate({ organizationId: org.id, active: !org.active });
      await refetchOrg();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update that organization's status.");
    } finally {
      setTogglingActive(false);
    }
  }

  return (
    <div className={styles.stack}>
      <div className={styles.identity}>
        {canEdit ? (
          <label className={styles.avatarWrap}>
            <Avatar src={org.avatarUrl ?? undefined} alt={org.name} size={64} radius="xl" />
            <input
              className={styles.avatarInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label="Change organization photo"
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
        ) : (
          <Avatar src={org.avatarUrl ?? undefined} alt={org.name} size={64} radius="xl" />
        )}

        <div className={styles.identityFields}>
          {canEdit ? (
            <TextInput
              aria-label="Name"
              value={name}
              disabled={saving}
              onChange={(event) => setDraftName(event.currentTarget.value)}
            />
          ) : (
            <span className={styles.nameDisplay}>{org.name}</span>
          )}
          {canEdit ? (
            <TextInput
              aria-label="Blurb"
              placeholder="A short description"
              value={blurb}
              disabled={saving}
              onChange={(event) => setDraftBlurb(event.currentTarget.value)}
            />
          ) : (
            org.blurb && <span className={styles.blurbDisplay}>{org.blurb}</span>
          )}
        </div>

        {canEdit && (
          <Button variant="secondary" size="sm" disabled={!isDirty || saving} onClick={() => void handleSave()}>
            Save
          </Button>
        )}
      </div>

      <RowCard>
        <Row label="Status">
          <div className={styles.rowEnd}>
            <span className={styles.status}>
              <span
                className={`${styles.statusDot} ${org.active ? styles.statusDotActive : styles.statusDotInactive}`}
              />
              {org.active ? "Active" : "Inactive"}
            </span>
            {canEdit && (
              <Button variant="text" size="sm" disabled={togglingActive} onClick={() => void handleToggleActive()}>
                {org.active ? "Deactivate" : "Activate"}
              </Button>
            )}
          </div>
        </Row>
      </RowCard>

      <ErrorMessage message={error} />
    </div>
  );
}
