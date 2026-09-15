import { useCallback, useEffect, useState } from "react";
import { Avatar, Menu, TextInput } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconCamera, IconChevronDown, IconSettings } from "@tabler/icons-react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { isAllowedAvatarFile } from "../AuthHelpers/avatar-rules";
import { Button, ErrorMessage, PageHeader, Row, RowCard, TextField } from "../components";
import type { TableColumn } from "../components";
import { Table } from "../components";
import { trpc } from "../trpc";
import styles from "./OrganizationDetail.module.css";

type OrgDetail = Awaited<ReturnType<typeof trpc.organizations.getByName.query>>;
type MembersResult = Awaited<ReturnType<typeof trpc.organizations.listMembers.query>>;
type MemberRow = MembersResult["members"][number];
type PickableUser = Awaited<ReturnType<typeof trpc.organizations.searchAddableUsers.query>>[number];
type SortKey = "name" | "email" | "role";

const PAGE_SIZE_OPTIONS = [10, 25, 50];

// /organizations/<name> -- the application-level org editor, replacing
// AdminOrganizations.tsx's old Edit modal (and folding in what its
// Members modal used to do). Looks a bit like ApplicationProfile.tsx on
// purpose (avatar + identity fields + a RowCard of status info), per the
// ask this was built from, then adds a full members table below --
// "all the features of our existing admin users table," scoped to this
// org's own roster.
//
// Access is membership-driven, not a feature flag: getByName returns
// NOT_FOUND for an unknown name (case-insensitive) or FORBIDDEN for one
// the caller can't view (not a member, and no admin.organizations.update
// override) -- either way this page redirects to /organizations rather
// than distinguishing them for the visitor. `canEdit` rides along on that
// same response and is the single gate for every write control below
// (Save, avatar upload, activate/deactivate, member role/remove/add) --
// it's the global admin.organizations.update permission, not a per-org
// "this member's own organization_users.role is admin" check. A member
// who isn't also an admin.organizations.update holder gets read-only
// access to their own org's page, including its member roster -- a real
// gap (an org "admin" role that grants no actual power here) flagged in
// trpc/routers/organizations.ts's own comments, not resolved this pass.
export function OrganizationDetail() {
  const { orgName } = useParams<{ orgName: string }>();
  const navigate = useNavigate();

  const [org, setOrg] = useState<OrgDetail | undefined>(undefined);
  const [denied, setDenied] = useState(false);
  const canEdit = org?.canEdit ?? false;

  const [draftName, setDraftName] = useState<string | null>(null);
  const [draftBlurb, setDraftBlurb] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [memberSearch, setMemberSearch] = useState("");
  const [debouncedMemberSearch] = useDebouncedValue(memberSearch, 300);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [membersResult, setMembersResult] = useState<MembersResult | undefined>(undefined);
  const [memberActionUserId, setMemberActionUserId] = useState<string | null>(null);
  const [membersError, setMembersError] = useState<string | null>(null);

  const [addMemberSearch, setAddMemberSearch] = useState("");
  const [debouncedAddMemberSearch] = useDebouncedValue(addMemberSearch, 300);
  const [addableUsers, setAddableUsers] = useState<PickableUser[]>([]);

  useEffect(() => {
    if (!orgName) return;
    let cancelled = false;
    // Reset to loading state on every orgName change -- React Router
    // reuses this component instance across param changes on the same
    // route (e.g. handleSave's own rename-redirect below), it doesn't
    // remount, so without this the previous org's data would stay
    // rendered while the new one loads.
    // oxlint-disable-next-line react/set-state-in-effect
    setOrg(undefined);
    // oxlint-disable-next-line react/set-state-in-effect
    setDenied(false);
    // oxlint-disable-next-line react/set-state-in-effect
    void trpc.organizations.getByName
      .query({ name: orgName })
      .then((result) => {
        if (!cancelled) setOrg(result);
      })
      .catch(() => {
        if (!cancelled) setDenied(true);
      });
    return () => {
      cancelled = true;
    };
  }, [orgName]);

  const fetchMembers = useCallback(() => {
    if (!org) return Promise.resolve(undefined);
    return trpc.organizations.listMembers.query({
      organizationId: org.id,
      page,
      pageSize,
      search: debouncedMemberSearch,
      sortBy: sortKey,
      sortDirection,
    });
  }, [org, page, pageSize, debouncedMemberSearch, sortKey, sortDirection]);

  useEffect(() => {
    let cancelled = false;
    void fetchMembers()
      .then((data) => {
        if (!cancelled && data) setMembersResult(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setMembersError(err instanceof Error ? err.message : "Couldn't load members.");
          setMembersResult({ members: [], total: 0 });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [fetchMembers]);

  useEffect(() => {
    const search = debouncedAddMemberSearch.trim();
    if (!org || !canEdit || search.length === 0) return;
    let cancelled = false;
    // oxlint-disable-next-line react/set-state-in-effect
    void trpc.organizations.searchAddableUsers
      .query({ organizationId: org.id, search })
      .then((result) => {
        if (!cancelled) setAddableUsers(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setMembersError(err instanceof Error ? err.message : "Couldn't search users.");
      });
    return () => {
      cancelled = true;
    };
  }, [org, canEdit, debouncedAddMemberSearch]);

  if (denied) return <Navigate to="/organizations" replace />;
  if (!org) return null;

  const name = draftName ?? org.name;
  const blurb = draftBlurb ?? org.blurb;
  const isDirty = (draftName !== null && draftName !== org.name) || (draftBlurb !== null && draftBlurb !== org.blurb);

  async function handleSave() {
    if (!org || !isDirty) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await trpc.organizations.update.mutate({ id: org.id, name: name.trim(), blurb: blurb.trim() });
      setOrg((current) => (current ? { ...current, name: updated!.name, blurb: updated!.blurb } : current));
      setDraftName(null);
      setDraftBlurb(null);
      if (updated!.name !== org.name) {
        navigate(`/organizations/${encodeURIComponent(updated!.name)}`, { replace: true });
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
    if (!file || !org) return;

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

      const confirmed = await trpc.organizations.confirmAvatarUpload.mutate({ organizationId: org.id, key });
      setOrg((current) => (current ? { ...current, avatarUrl: confirmed.avatarUrl } : current));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't upload that image.");
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleToggleActive() {
    if (!org) return;
    setError(null);
    setTogglingActive(true);
    try {
      const updated = await trpc.organizations.setActive.mutate({ id: org.id, active: !org.active });
      setOrg((current) => (current ? { ...current, active: updated!.active } : current));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update that organization's status.");
    } finally {
      setTogglingActive(false);
    }
  }

  function handleMemberSearchChange(value: string) {
    setMemberSearch(value);
    setPage(1);
  }

  function handleSortChange(key: string) {
    if (key === sortKey) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key as SortKey);
      setSortDirection("asc");
    }
  }

  async function handleMemberRoleChange(member: MemberRow, role: "admin" | "standard") {
    if (!org || role === member.role) return;
    setMembersError(null);
    setMemberActionUserId(member.id);
    try {
      await trpc.organizations.setMemberRole.mutate({ organizationId: org.id, userId: member.id, role });
      setMembersResult(await fetchMembers());
    } catch (err) {
      setMembersError(err instanceof Error ? err.message : "Couldn't update that member's role.");
    } finally {
      setMemberActionUserId(null);
    }
  }

  async function handleRemoveMember(member: MemberRow) {
    if (!org) return;
    setMembersError(null);
    setMemberActionUserId(member.id);
    try {
      await trpc.organizations.removeMember.mutate({ organizationId: org.id, userId: member.id });
      setMembersResult(await fetchMembers());
    } catch (err) {
      setMembersError(err instanceof Error ? err.message : "Couldn't remove that member.");
    } finally {
      setMemberActionUserId(null);
    }
  }

  async function handleAddMember(user: PickableUser) {
    if (!org) return;
    setMembersError(null);
    setMemberActionUserId(user.id);
    try {
      await trpc.organizations.addMember.mutate({ organizationId: org.id, userId: user.id });
      setAddableUsers((current) => current.filter((candidate) => candidate.id !== user.id));
      setMembersResult(await fetchMembers());
    } catch (err) {
      setMembersError(err instanceof Error ? err.message : "Couldn't add that member.");
    } finally {
      setMemberActionUserId(null);
    }
  }

  const memberColumns: TableColumn<MemberRow>[] = [
    {
      key: "avatar",
      header: "",
      width: 56,
      render: (member) => <Avatar src={member.avatarUrl ?? undefined} alt={member.name} size={32} radius="xl" />,
    },
    { key: "name", header: "Name", enableSort: true, render: (member) => member.name },
    { key: "email", header: "Email", enableSort: true, render: (member) => member.email },
    {
      key: "role",
      header: "Organization Role",
      enableSort: true,
      width: 180,
      render: (member) => {
        const label = member.role === "admin" ? "Admin" : "Standard";
        if (!canEdit) {
          return <span className={styles.mono}>{label}</span>;
        }
        return (
          <Menu width={160} position="bottom-start" disabled={memberActionUserId === member.id}>
            <Menu.Target>
              <button type="button" className={styles.cellDropdown}>
                <span className={styles.mono}>{label}</span>
                <IconChevronDown size={14} stroke={1.75} />
              </button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item disabled={member.role === "admin"} onClick={() => void handleMemberRoleChange(member, "admin")}>
                Admin
              </Menu.Item>
              <Menu.Item
                disabled={member.role === "standard"}
                onClick={() => void handleMemberRoleChange(member, "standard")}
              >
                Standard
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        );
      },
    },
    // Gear column only exists at all for an editor -- a spread, not a
    // ternary returning a column or null, so TableColumn<MemberRow>[]'s
    // element type never has to widen to include null (same precedent
    // AdminUsers.tsx's own settings column uses).
    ...(canEdit
      ? [
          {
            key: "settings",
            header: "",
            width: 52,
            render: (member: MemberRow) => (
              <Menu width={160} position="bottom-end">
                <Menu.Target>
                  <button type="button" className={styles.iconButton} aria-label={`Settings for ${member.name}`}>
                    <IconSettings size={16} stroke={1.75} />
                  </button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item disabled={memberActionUserId === member.id} onClick={() => void handleRemoveMember(member)}>
                    Remove
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            ),
          } satisfies TableColumn<MemberRow>,
        ]
      : []),
  ];

  return (
    <PageHeader eyebrow="Organizations" title={org.name}>
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
              {avatarUploading ? <span className={styles.avatarOverlayLabel}>…</span> : <IconCamera size={20} stroke={1.75} />}
            </span>
          </label>
        ) : (
          <Avatar src={org.avatarUrl ?? undefined} alt={org.name} size={64} radius="xl" />
        )}

        <div className={styles.identityFields}>
          {canEdit ? (
            <TextInput aria-label="Name" value={name} disabled={saving} onChange={(event) => setDraftName(event.currentTarget.value)} />
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
              <span className={`${styles.statusDot} ${org.active ? styles.statusDotActive : styles.statusDotInactive}`} />
              {org.active ? "Active" : "Inactive"}
            </span>
            {canEdit && (
              <Button variant="text" size="sm" disabled={togglingActive} onClick={() => void handleToggleActive()}>
                {org.active ? "Deactivate" : "Activate"}
              </Button>
            )}
          </div>
        </Row>
        <Row label="Members">
          <span className={styles.mono}>{membersResult?.total ?? "—"}</span>
        </Row>
      </RowCard>

      <ErrorMessage message={error} />

      <section>
        <h2 className={styles.sectionTitle}>Members</h2>
        <ErrorMessage message={membersError} />
        <Table
          columns={memberColumns}
          rows={membersResult?.members ?? []}
          rowKey={(member) => member.id}
          loading={membersResult === undefined}
          emptyLabel="No members yet."
          search={{ value: memberSearch, onChange: handleMemberSearchChange, placeholder: "Search by name or email" }}
          sort={{ activeKey: sortKey, direction: sortDirection, onChange: handleSortChange }}
          pagination={{
            page,
            pageSize,
            total: membersResult?.total ?? 0,
            pageSizeOptions: PAGE_SIZE_OPTIONS,
            onPageChange: setPage,
            onPageSizeChange: (size) => {
              setPageSize(size);
              setPage(1);
            },
          }}
        />
      </section>

      {canEdit && (
        <section>
          <h2 className={styles.sectionTitle}>Add a member</h2>
          <TextField
            label="Search by name or email"
            name="addMemberSearch"
            value={addMemberSearch}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setAddMemberSearch(value);
              if (value.trim().length === 0) setAddableUsers([]);
            }}
          />
          {addableUsers.length > 0 && (
            <RowCard>
              {addableUsers.map((user) => (
                <Row key={user.id} label={user.name} description={user.email}>
                  <Button
                    variant="text"
                    size="sm"
                    disabled={memberActionUserId === user.id}
                    onClick={() => void handleAddMember(user)}
                  >
                    Add
                  </Button>
                </Row>
              ))}
            </RowCard>
          )}
        </section>
      )}
    </PageHeader>
  );
}
