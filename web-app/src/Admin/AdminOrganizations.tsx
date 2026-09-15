import { useCallback, useEffect, useState } from "react";
import { Avatar, Menu, Modal } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconSettings } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { authClient } from "../AuthHelpers/auth-client";
import { hasFeature } from "../AuthHelpers/permissions";
import { Button, ErrorMessage, Row, RowCard, TextField, Tooltip } from "../components";
import type { TableColumn } from "../components";
import { Table } from "../components";
import { trpc } from "../trpc";
import panelStyles from "./AdminPanel.module.css";
import styles from "./AdminOrganizations.module.css";

type Organization = Awaited<ReturnType<typeof trpc.organizations.list.query>>[number];
type PickableUser = Awaited<ReturnType<typeof trpc.organizations.searchUsers.query>>[number];

// The site-wide overview: every organization, admin.organizations.view/
// .update-gated. Editing one (name/blurb/avatar) and managing its
// membership both live on its own page now (/organizations/<name>,
// OrganizationDetail.tsx) instead of a modal here -- this table's own gear
// just navigates there, plus the still-modal-based Activate/Deactivate
// (a quick, list-level action that doesn't need the full page). Four
// permissions gate this page, same layering as every other admin tab
// (AdminSiteSettings.tsx's canView/canUpdate): page.admin.organizations
// just reaches the tab; admin.organizations.view is the real view gate (a
// role can have the former without the latter -- see
// trpc/routers/organizations.ts's own comment); admin.organizations.update
// gates Activate/Deactivate here and everything on the detail page. Create
// is different on purpose: it's gated by application.organizations.create,
// not an admin-prefixed key -- there's no admin.organizations.create at
// all (a deliberate correction mid-build, see the seed migration's
// comment). This tab is currently the only surface that calls it, but the
// permission itself isn't admin-only.
export function AdminOrganizations() {
  const navigate = useNavigate();
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

  // Activate/deactivate confirmation -- same shape as AdminUsers.tsx's own
  // confirmUser/confirmToggleActive. Kept as a quick, list-level modal
  // (unlike Edit/Members, which moved to the detail page) since it's a
  // single boolean with nothing else to fill in.
  const [confirmOrg, setConfirmOrg] = useState<Organization | null>(null);
  const [togglingActive, setTogglingActive] = useState(false);

  const load = useCallback(() => trpc.organizations.list.query(), []);

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

  const columns: TableColumn<Organization>[] = [
    {
      key: "avatar",
      header: "",
      width: 56,
      render: (org) => <Avatar src={org.avatarUrl ?? undefined} alt={org.name} size={32} radius="xl" />,
    },
    { key: "name", header: "Name", render: (org) => org.name },
    {
      key: "blurb",
      header: "Blurb",
      // A fixed track, not flexible -- name is the column that should
      // absorb extra width; a long blurb truncates in place instead.
      width: 220,
      render: (org) =>
        org.blurb ? (
          <Tooltip label={org.blurb} multiline maw={320}>
            <span className={styles.blurbCell}>{org.blurb}</span>
          </Tooltip>
        ) : (
          <span className={styles.mono}>—</span>
        ),
    },
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
            <Menu.Item onClick={() => navigate(`/organizations/${encodeURIComponent(org.name)}`)}>Open</Menu.Item>
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
    </div>
  );
}
