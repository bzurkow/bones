import { useCallback, useEffect, useState } from "react";
import { Menu, Modal, Switch } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconSettings } from "@tabler/icons-react";
import { authClient } from "../AuthHelpers/auth-client";
import { hasFeature } from "../AuthHelpers/permissions";
import { Button, ErrorMessage, Row, RowCard, TextField } from "../components";
import type { TableColumn } from "../components";
import { Table } from "../components";
import { trpc } from "../trpc";
import panelStyles from "./AdminPanel.module.css";
import styles from "./AdminOrganizations.module.css";

type Organization = Awaited<ReturnType<typeof trpc.organizations.list.query>>[number];
type Member = Awaited<ReturnType<typeof trpc.organizations.listMembers.query>>[number];
// searchAddableUsers and searchUsers return the same {id, name, email}
// shape -- one picker-result type for both, rather than two identical
// interfaces.
type PickableUser = Awaited<ReturnType<typeof trpc.organizations.searchUsers.query>>[number];

// A group of users, with membership (organization_users, "admin"/
// "standard" per member). Four permissions gate this page, same layering
// as every other admin tab (AdminSiteSettings.tsx's canView/canUpdate):
// page.admin.organizations just reaches the tab; admin.organizations.view
// is the real view gate (a role can have the former without the latter --
// see trpc/routers/organizations.ts's own comment) and governs the table
// plus the Members modal's member list; admin.organizations.update gates
// Edit, activate/deactivate, and every membership change (add/remove/
// re-role). Create is different on purpose: it's gated by
// application.organizations.create, not an admin-prefixed key -- there's
// no admin.organizations.create at all (a deliberate correction mid-build,
// see the seed migration's comment). This tab is currently the only
// surface that calls it, but the permission itself isn't admin-only.
export function AdminOrganizations() {
  const { data: session } = authClient.useSession();
  const canView = hasFeature(session?.enabledFeatures, "admin.organizations.view");
  const canUpdate = hasFeature(session?.enabledFeatures, "admin.organizations.update");
  const canCreate = hasFeature(session?.enabledFeatures, "application.organizations.create");

  const [organizations, setOrganizations] = useState<Organization[] | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  // Create modal -- name/blurb plus a required initial admin, picked via
  // search (organizations.searchUsers). Every organization must have an
  // admin from the moment it's created (trpc/routers/organizations.ts's
  // `create` inserts both rows in one transaction), so there's no way to
  // submit this form without one selected.
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createBlurb, setCreateBlurb] = useState("");
  const [createAdminSearch, setCreateAdminSearch] = useState("");
  const [debouncedCreateAdminSearch] = useDebouncedValue(createAdminSearch, 300);
  const [createAdminResults, setCreateAdminResults] = useState<PickableUser[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<PickableUser | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // The org pending edit (name/blurb only -- see update's own comment on
  // why active isn't part of this form) -- non-null opens the modal below.
  // Holding the row itself (not just an id) lets the form seed its fields
  // directly, no separate lookup.
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [editName, setEditName] = useState("");
  const [editBlurb, setEditBlurb] = useState("");
  const [saving, setSaving] = useState(false);

  // Activate/deactivate confirmation -- same shape as AdminUsers.tsx's own
  // confirmUser/confirmToggleActive.
  const [confirmOrg, setConfirmOrg] = useState<Organization | null>(null);
  const [togglingActive, setTogglingActive] = useState(false);

  // The org whose Members modal is open -- separate from editingOrg above
  // so editing attributes (a batch, Save/Cancel'd) and managing membership
  // (each add/remove/re-role applies immediately, no batch) never share
  // one modal with two different commit models.
  const [membersOrg, setMembersOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Member[] | undefined>(undefined);
  const [memberSearch, setMemberSearch] = useState("");
  const [debouncedMemberSearch] = useDebouncedValue(memberSearch, 300);
  const [addableUsers, setAddableUsers] = useState<PickableUser[]>([]);
  // Which user's add/remove/re-role is in flight -- disables just that
  // row's control, same "can't double-fire" reasoning as AdminUsers.tsx's
  // own updatingUserId.
  const [memberActionUserId, setMemberActionUserId] = useState<string | null>(null);
  const [membersError, setMembersError] = useState<string | null>(null);

  const load = useCallback(() => trpc.organizations.list.query(), []);
  const loadMembers = useCallback(
    (organizationId: string) => trpc.organizations.listMembers.query({ organizationId }),
    [],
  );

  useEffect(() => {
    // Gated on canView, same reasoning as AdminSiteSettings.tsx's own load
    // effect -- a role without it won't render the table below anyway.
    if (!canView) return;
    let cancelled = false;
    // oxlint-disable-next-line react/set-state-in-effect
    void load()
      .then((result) => {
        if (!cancelled) setOrganizations(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Couldn't load organizations.");
          setOrganizations([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [canView, load]);

  function openCreate() {
    setCreateOpen(true);
    setCreateName("");
    setCreateBlurb("");
    setCreateAdminSearch("");
    setCreateAdminResults([]);
    setSelectedAdmin(null);
    setCreateError(null);
  }

  useEffect(() => {
    const search = debouncedCreateAdminSearch.trim();
    if (!createOpen || search.length === 0) return;
    let cancelled = false;
    // oxlint-disable-next-line react/set-state-in-effect
    void trpc.organizations.searchUsers
      .query({ search })
      .then((result) => {
        if (!cancelled) setCreateAdminResults(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setCreateError(err instanceof Error ? err.message : "Couldn't search users.");
      });
    return () => {
      cancelled = true;
    };
  }, [createOpen, debouncedCreateAdminSearch]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedAdmin) return;
    setCreateError(null);
    setCreating(true);
    try {
      await trpc.organizations.create.mutate({
        name: createName.trim(),
        blurb: createBlurb.trim(),
        initialAdminUserId: selectedAdmin.id,
      });
      setCreateOpen(false);
      setOrganizations(await load());
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Couldn't create that organization.");
    } finally {
      setCreating(false);
    }
  }

  function openEdit(org: Organization) {
    setEditingOrg(org);
    setEditName(org.name);
    setEditBlurb(org.blurb);
  }

  async function handleSaveEdit() {
    if (!editingOrg) return;
    setError(null);
    setSaving(true);
    try {
      await trpc.organizations.update.mutate({ id: editingOrg.id, name: editName.trim(), blurb: editBlurb.trim() });
      setEditingOrg(null);
      setOrganizations(await load());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update that organization.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmToggleActive() {
    if (!confirmOrg) return;
    setError(null);
    setTogglingActive(true);
    try {
      await trpc.organizations.setActive.mutate({ id: confirmOrg.id, active: !confirmOrg.active });
      setConfirmOrg(null);
      setOrganizations(await load());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update that organization's status.");
    } finally {
      setTogglingActive(false);
    }
  }

  function openMembers(org: Organization) {
    setMembersOrg(org);
    setMembers(undefined);
    setMemberSearch("");
    setAddableUsers([]);
    setMembersError(null);
  }

  useEffect(() => {
    if (!membersOrg) return;
    let cancelled = false;
    // oxlint-disable-next-line react/set-state-in-effect
    void loadMembers(membersOrg.id)
      .then((result) => {
        if (!cancelled) setMembers(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setMembersError(err instanceof Error ? err.message : "Couldn't load members.");
      });
    return () => {
      cancelled = true;
    };
  }, [membersOrg, loadMembers]);

  useEffect(() => {
    // No state reset here for the empty-search case -- addableUsers is
    // cleared directly from the event that causes it instead (the search
    // field's own onChange below, and openMembers on open), same "update
    // it from the event that caused the change" idiom AdminUsers.tsx's
    // handleSearchChange already uses, rather than reactively in this
    // effect (oxlint's react/set-state-in-effect).
    const search = debouncedMemberSearch.trim();
    if (!membersOrg || !canUpdate || search.length === 0) return;
    let cancelled = false;
    // oxlint-disable-next-line react/set-state-in-effect
    void trpc.organizations.searchAddableUsers
      .query({ organizationId: membersOrg.id, search })
      .then((result) => {
        if (!cancelled) setAddableUsers(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setMembersError(err instanceof Error ? err.message : "Couldn't search users.");
      });
    return () => {
      cancelled = true;
    };
  }, [membersOrg, canUpdate, debouncedMemberSearch]);

  async function handleAddMember(user: PickableUser) {
    if (!membersOrg) return;
    setMembersError(null);
    setMemberActionUserId(user.id);
    try {
      await trpc.organizations.addMember.mutate({ organizationId: membersOrg.id, userId: user.id });
      setMembers(await loadMembers(membersOrg.id));
      setAddableUsers((current) => current.filter((candidate) => candidate.id !== user.id));
      setOrganizations(await load());
    } catch (err) {
      setMembersError(err instanceof Error ? err.message : "Couldn't add that member.");
    } finally {
      setMemberActionUserId(null);
    }
  }

  async function handleRemoveMember(member: Member) {
    if (!membersOrg) return;
    setMembersError(null);
    setMemberActionUserId(member.id);
    try {
      await trpc.organizations.removeMember.mutate({ organizationId: membersOrg.id, userId: member.id });
      setMembers(await loadMembers(membersOrg.id));
      setOrganizations(await load());
    } catch (err) {
      setMembersError(err instanceof Error ? err.message : "Couldn't remove that member.");
    } finally {
      setMemberActionUserId(null);
    }
  }

  async function handleMemberRoleChange(member: Member, role: "admin" | "standard") {
    if (!membersOrg || role === member.role) return;
    setMembersError(null);
    setMemberActionUserId(member.id);
    try {
      await trpc.organizations.setMemberRole.mutate({ organizationId: membersOrg.id, userId: member.id, role });
      setMembers(await loadMembers(membersOrg.id));
    } catch (err) {
      setMembersError(err instanceof Error ? err.message : "Couldn't update that member's role.");
    } finally {
      setMemberActionUserId(null);
    }
  }

  const columns: TableColumn<Organization>[] = [
    { key: "name", header: "Name", render: (org) => org.name },
    {
      key: "memberCount",
      header: "Users",
      width: 90,
      render: (org) => <span className={styles.mono}>{org.memberCount}</span>,
    },
    {
      key: "settings",
      header: "",
      width: 52,
      render: (org) => (
        <Menu width={200} position="bottom-end">
          <Menu.Target>
            <button type="button" className={styles.iconButton} aria-label={`Settings for ${org.name}`}>
              <IconSettings size={16} stroke={1.75} />
            </button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item onClick={() => openMembers(org)}>Members</Menu.Item>
            <Menu.Item disabled={!canUpdate} onClick={() => openEdit(org)}>
              Edit
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item disabled={!canUpdate} onClick={() => setConfirmOrg(org)}>
              {org.active ? "Deactivate" : "Activate"}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      ),
    },
  ];

  return (
    <div className={panelStyles.stack}>
      <p className={panelStyles.body}>Groups of users.</p>

      <div className={styles.toolbar}>
        <Button disabled={!canCreate} onClick={openCreate}>
          Create organization
        </Button>
      </div>

      {canView && (
        <Table
          columns={columns}
          rows={organizations ?? []}
          rowKey={(org) => org.id}
          loading={organizations === undefined}
          emptyLabel="No organizations yet."
          // Same grayscale-safe treatment AdminUsers.tsx's own inactive
          // rows use -- see organizations-schema.ts's comment.
          rowClassName={(org) => (org.active ? undefined : styles.inactiveRow)}
        />
      )}

      <ErrorMessage message={error} />

      <Modal opened={createOpen} onClose={() => setCreateOpen(false)} title="Create an organization">
        <form className={styles.editBody} onSubmit={(event) => void handleCreate(event)}>
          <TextField
            label="Name"
            name="createName"
            required
            value={createName}
            onChange={(event) => setCreateName(event.currentTarget.value)}
          />
          <TextField
            label="Blurb"
            name="createBlurb"
            value={createBlurb}
            onChange={(event) => setCreateBlurb(event.currentTarget.value)}
          />

          <div className={styles.addMemberSection}>
            {selectedAdmin ? (
              <RowCard>
                <Row label={selectedAdmin.name} description={selectedAdmin.email}>
                  <Button variant="text" size="sm" onClick={() => setSelectedAdmin(null)}>
                    Change
                  </Button>
                </Row>
              </RowCard>
            ) : (
              <>
                <TextField
                  label="Initial admin"
                  name="createAdminSearch"
                  placeholder="Search by name or email"
                  value={createAdminSearch}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setCreateAdminSearch(value);
                    if (value.trim().length === 0) setCreateAdminResults([]);
                  }}
                />
                {createAdminResults.length > 0 && (
                  <RowCard>
                    {createAdminResults.map((user) => (
                      <Row key={user.id} label={user.name} description={user.email}>
                        <Button
                          variant="text"
                          size="sm"
                          onClick={() => {
                            setSelectedAdmin(user);
                            setCreateAdminSearch("");
                            setCreateAdminResults([]);
                          }}
                        >
                          Select
                        </Button>
                      </Row>
                    ))}
                  </RowCard>
                )}
              </>
            )}
          </div>

          <ErrorMessage message={createError} />

          <div className={styles.editActions}>
            <Button type="submit" disabled={!canCreate || creating || !selectedAdmin}>
              {creating ? "Creating…" : "Create organization"}
            </Button>
            <Button variant="quiet" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      <Modal opened={editingOrg !== null} onClose={() => setEditingOrg(null)} title={editingOrg ? `Edit ${editingOrg.name}` : ""}>
        {editingOrg && (
          <div className={styles.editBody}>
            <TextField
              label="Name"
              name="editName"
              required
              value={editName}
              onChange={(event) => setEditName(event.currentTarget.value)}
            />
            <TextField
              label="Blurb"
              name="editBlurb"
              value={editBlurb}
              onChange={(event) => setEditBlurb(event.currentTarget.value)}
            />
            <div className={styles.editActions}>
              <Button onClick={() => void handleSaveEdit()} loading={saving}>
                Save
              </Button>
              <Button variant="quiet" onClick={() => setEditingOrg(null)} disabled={saving}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        opened={confirmOrg !== null}
        onClose={() => setConfirmOrg(null)}
        title={confirmOrg ? `${confirmOrg.active ? "Deactivate" : "Activate"} ${confirmOrg.name}?` : ""}
      >
        {confirmOrg && (
          <div className={styles.editBody}>
            <p className={panelStyles.body}>
              Confirm that you want to {confirmOrg.active ? "deactivate" : "activate"} {confirmOrg.name}.
            </p>
            <div className={styles.editActions}>
              <Button onClick={() => void confirmToggleActive()} loading={togglingActive}>
                {confirmOrg.active ? "Deactivate" : "Activate"}
              </Button>
              <Button variant="quiet" onClick={() => setConfirmOrg(null)} disabled={togglingActive}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        opened={membersOrg !== null}
        onClose={() => setMembersOrg(null)}
        title={membersOrg ? `Members of ${membersOrg.name}` : ""}
      >
        {membersOrg && (
          <div className={styles.editBody}>
            {members !== undefined &&
              (members.length === 0 ? (
                <p className={panelStyles.body}>No members yet.</p>
              ) : (
                <RowCard>
                  {members.map((member) => (
                    <Row key={member.id} label={member.name} description={member.email}>
                      <div className={styles.rowEnd}>
                        {canUpdate ? (
                          <Switch
                            aria-label={`${member.name} is admin`}
                            label="Admin"
                            checked={member.role === "admin"}
                            disabled={memberActionUserId === member.id}
                            onChange={(event) =>
                              void handleMemberRoleChange(member, event.currentTarget.checked ? "admin" : "standard")
                            }
                          />
                        ) : (
                          <span className={styles.mono}>{member.role === "admin" ? "Admin" : "Standard"}</span>
                        )}
                        <Button
                          variant="text"
                          size="sm"
                          disabled={!canUpdate || memberActionUserId === member.id}
                          onClick={() => void handleRemoveMember(member)}
                        >
                          Remove
                        </Button>
                      </div>
                    </Row>
                  ))}
                </RowCard>
              ))}

            {canUpdate && (
              <div className={styles.addMemberSection}>
                <TextField
                  label="Add a member"
                  name="memberSearch"
                  placeholder="Search by name or email"
                  value={memberSearch}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setMemberSearch(value);
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
              </div>
            )}

            <ErrorMessage message={membersError} />
          </div>
        )}
      </Modal>
    </div>
  );
}
