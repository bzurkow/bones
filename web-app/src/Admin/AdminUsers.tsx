import { useCallback, useEffect, useState } from "react";
import { Avatar, Menu, Modal } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconChevronDown, IconSettings } from "@tabler/icons-react";
import type { AuthProtocolName, UserRole } from "backend";
import { authClient } from "../AuthHelpers/auth-client";
import { hasFeature } from "../AuthHelpers/permissions";
import { Button, ErrorMessage, Table } from "../components";
import type { TableColumn } from "../components";
import { trpc } from "../trpc";
import styles from "./AdminUsers.module.css";

type ListUsersResult = Awaited<ReturnType<typeof trpc.admin.listUsers.query>>;
type UserRow = ListUsersResult["users"][number];
// Matches admin.ts's own SORTABLE_COLUMNS keys -- kept as a plain local
// union rather than derived from the router's input type, since this file
// already owns the column definitions those keys come from anyway. "active"
// dropped 2026-09-14 along with the Status column itself (folded into the
// settings-button column below, which has no clickable header to sort
// from) -- admin.ts's own allowlist keeps the entry regardless, unrelated
// to whether this page currently has UI to request it.
type SortKey = "name" | "email" | "role" | "createdAt";

const PAGE_SIZE_OPTIONS = [10, 25, 50];

// Short table-cell labels, distinct from AdminSiteSettings.tsx's own
// PROTOCOL_INFO (label + a full sentence description, sized for a settings
// row not a table column). Keyed by AuthProtocolName for the same reason
// that map is -- a protocol added to auth-protocols.ts with no matching
// entry here is a type error, not a silently blank cell.
const PROTOCOL_LABELS: Record<AuthProtocolName, string> = {
  email: "Email",
  google: "Google",
};

// Role/status are live editable dropdowns (setUserRole/setUserActive
// below) -- everything else (name, email, joined) stays read-only.
//
// The "can't target your own row" guard (admin.ts) is still just an ad hoc
// self-lockout check, separate from the real permission checks below --
// kept exactly as-is per an explicit decision during RBAC planning (see
// bones-roadmap-notes.md item 3) not to fold the two together this pass.
export function AdminUsers() {
  const { data: session } = authClient.useSession();
  const canUpdateRole = hasFeature(session?.enabledFeatures, "admin.users.update-role");
  const canUpdateOwner = hasFeature(session?.enabledFeatures, "admin.users.update-owner");
  const canUpdateStatus = hasFeature(session?.enabledFeatures, "admin.users.update-status");
  // The settings-button column's own visibility rule (per the feature
  // permissions checklist): shown if the caller can view OR update
  // anything it holds. Right now that's a single item -- activate/
  // deactivate, update-gated only, no separate "view status" permission
  // (active/inactive is conveyed ambiently via the inactive row background
  // below, visible to anyone who can reach this page at all) -- so this
  // reduces to canUpdateStatus alone. Extend this boolean, not the
  // rendering logic below, as more permission-gated items land in the menu.
  const canSeeSettingsColumn = canUpdateStatus;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 300);
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  // undefined: still loading the first page. Distinct from "loaded, zero
  // rows" the same way AdminTerms.tsx's `current` does.
  const [result, setResult] = useState<ListUsersResult | undefined>(undefined);
  // Which row has a role/status change in flight -- disables that row's
  // dropdowns so a second click can't fire before the first one resolves.
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The user pending activate/deactivate confirmation -- non-null opens the
  // modal below. Holding the row itself (not just an id) means the modal
  // can read its current name/active state directly, no separate lookup.
  const [confirmUser, setConfirmUser] = useState<UserRow | null>(null);
  // Roles are admin-creatable/deletable now (see AdminRoles.tsx), so this
  // dropdown's options come from a live query instead of the old hardcoded
  // ROLE_LABELS map -- fetched once on mount, same "doesn't need to be
  // reactive to a role being added/removed in another tab right now" scope
  // as the rest of this page.
  const [roles, setRoles] = useState<{ name: string }[]>([]);

  useEffect(() => {
    void trpc.roles.list.query().then(setRoles);
  }, []);

  // A new search term always starts back at page 1 -- staying on, say,
  // page 3 of an old, wider result set would silently show nothing once
  // the narrower search comes back with fewer than 3 pages. Reset directly
  // in the input's own change handler (the actual event that causes it),
  // not reactively in a useEffect watching debouncedSearch -- besides
  // being what oxlint's set-state-in-effect guidance itself recommends
  // ("update it from the event that caused the change"), resetting
  // immediately on keystroke reads better anyway: no reason to wait for
  // the debounce just to flip the page number back to 1.
  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  // Pulled out of the effect so a role/status change can re-run the exact
  // same query afterwards to refresh the row, instead of duplicating the
  // fetch call or hand-patching the row in local state.
  const fetchUsers = useCallback(
    () => trpc.admin.listUsers.query({ page, pageSize, search: debouncedSearch, sortBy: sortKey, sortDirection }),
    [page, pageSize, debouncedSearch, sortKey, sortDirection],
  );

  useEffect(() => {
    let cancelled = false;
    void fetchUsers()
      .then((data) => {
        if (!cancelled) setResult(data);
      })
      .catch((err: unknown) => {
        // A role with page.admin.users (so it can reach this tab at all)
        // but not admin.users.view (its own, more specific permission --
        // e.g. "demo" per the RBAC seed) genuinely gets FORBIDDEN here,
        // not a bug. Show that instead of spinning forever.
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Couldn't load users.");
          setResult({ users: [], total: 0 });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [fetchUsers]);

  // Table only reports "this column's header was clicked" -- the actual
  // asc/desc/switch-columns toggle logic lives here, with the data.
  function handleSortChange(key: string) {
    if (key === sortKey) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key as SortKey);
      setSortDirection("asc");
    }
  }

  async function handleRoleChange(user: UserRow, role: UserRole) {
    if (role === user.role) return;
    setError(null);
    setUpdatingUserId(user.id);
    try {
      await trpc.admin.setUserRole.mutate({ userId: user.id, role });
      setResult(await fetchUsers());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update that user's role.");
    } finally {
      setUpdatingUserId(null);
    }
  }

  async function handleActiveChange(user: UserRow, active: boolean) {
    if (active === user.active) return;
    setError(null);
    setUpdatingUserId(user.id);
    try {
      await trpc.admin.setUserActive.mutate({ userId: user.id, active });
      setResult(await fetchUsers());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update that user's status.");
    } finally {
      setUpdatingUserId(null);
    }
  }

  // The confirmation modal's own Confirm button -- closes either way once
  // handleActiveChange settles; a failure still surfaces via the page-level
  // ErrorMessage below, same as every other mutation on this page.
  async function confirmToggleActive() {
    if (!confirmUser) return;
    await handleActiveChange(confirmUser, !confirmUser.active);
    setConfirmUser(null);
  }

  const columns: TableColumn<UserRow>[] = [
    {
      key: "avatar",
      header: "",
      width: 56,
      render: (user) => (
        <Avatar src={user.avatarUrl ?? user.image ?? undefined} alt={user.name} size={32} radius="xl" />
      ),
    },
    // Name/Email are the only two columns left flexible -- they're the
    // only content here of genuinely variable length (a full name, a full
    // email address), so they're also the only ones that should absorb
    // the table's leftover width. Every other column below gets a fixed
    // `width` sized to its actual content (a role label, a status pill, a
    // date) instead of stretching to an equal, mostly-empty share.
    { key: "name", header: "Name", enableSort: true, render: (user) => user.name },
    { key: "email", header: "Email", enableSort: true, render: (user) => user.email },
    {
      key: "authProtocols",
      header: "Auth Protocol",
      // Not sortable/searchable -- a user's own multi-valued list, not a
      // single backing column admin.ts's SORTABLE_COLUMNS could point at
      // (same reasoning that map's own comment gives for a future
      // calculated column).
      // Fits "Email, Google" (both known protocols linked) in mono, same
      // treatment as every other machine-produced value in this table
      // (CLAUDE.md rule 2).
      width: 160,
      render: (user) => (
        <span className={styles.mono}>
          {user.authProtocols.length > 0
            ? user.authProtocols.map((protocol) => PROTOCOL_LABELS[protocol] ?? protocol).join(", ")
            : "—"}
        </span>
      ),
    },
    {
      key: "role",
      header: "Role",
      enableSort: true,
      // Fits "Administrator" plus the dropdown chevron, in the mono font
      // its cell actually renders in. A custom role could in principle be
      // named longer than that -- this stays a starting width, not a cap
      // (Table columns are always drag-resizable).
      width: 170,
      render: (user) => {
        // Plain text, no chevron, no menu, no possible click -- both for
        // admin.ts's self-lockout guard (your own row) and for a role
        // that genuinely can't change anyone's role at all. Moving
        // someone to/from "owner" specifically also needs
        // admin.users.update-owner (checked per-option below, inside the
        // menu) -- but if update-role itself is missing, there's nothing
        // this dropdown could ever do, so it doesn't render as one.
        if (user.id === session?.user.id || !canUpdateRole) {
          return <span className={styles.mono}>{user.role}</span>;
        }
        return (
          <Menu width={190} position="bottom-start" disabled={updatingUserId === user.id}>
            <Menu.Target>
              <button type="button" className={styles.cellDropdown}>
                <span className={styles.mono}>{user.role}</span>
                <IconChevronDown size={14} stroke={1.75} />
              </button>
            </Menu.Target>
            <Menu.Dropdown>
              {roles.map((role) => (
                <Menu.Item
                  key={role.name}
                  disabled={
                    role.name === user.role || ((role.name === "owner" || user.role === "owner") && !canUpdateOwner)
                  }
                  onClick={() => void handleRoleChange(user, role.name)}
                >
                  {role.name}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
        );
      },
    },
    {
      key: "createdAt",
      header: "Joined",
      enableSort: true,
      // Fits "September 11, 2026" (longest month name) in mono.
      width: 180,
      render: (user) => (
        <span className={styles.mono}>
          {new Date(user.createdAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </span>
      ),
    },
    // Active/inactive itself is no longer a column value -- conveyed
    // ambiently by the inactive row background below (rowClassName),
    // visible to anyone who can see the table at all. This column is just
    // the row's actions; today that's one item, activate/deactivate.
    // Furthest right, last column -- a row's own actions read as a
    // trailing affordance, not a data field competing with the rest of the
    // row. The whole column is conditional on canSeeSettingsColumn
    // (view-or-update of anything it holds) -- a spread, not a ternary
    // returning a column or null, so TableColumn<UserRow>[]'s element type
    // never has to widen to include null.
    ...(canSeeSettingsColumn
      ? [
          {
            key: "settings",
            header: "",
            width: 52,
            render: (user) => {
              const isSelf = user.id === session?.user.id;
              // Matches admin.ts's own hard floor: owner can't be
              // deactivated by anyone, not even another owner -- only the
              // deactivate direction on a currently-active owner is
              // blocked, so a (hypothetically) inactive owner can still be
              // reactivated. UI-side reflection of that rule, not the only
              // thing enforcing it -- the backend guard is real.
              const isOwnerDeactivate = user.role === "owner" && user.active;
              // Disabled, not hidden -- same "present but inert" treatment
              // as the owner-lock Menu.Item in the role dropdown above, so
              // the button/menu itself stays a consistent, always-there
              // affordance for whatever else lands in it later, even on a
              // row where activate/deactivate specifically doesn't apply.
              const activateItemDisabled =
                isSelf || !canUpdateStatus || updatingUserId === user.id || isOwnerDeactivate;
              return (
                <Menu width={200} position="bottom-end">
                  <Menu.Target>
                    <button type="button" className={styles.iconButton} aria-label={`Settings for ${user.name}`}>
                      <IconSettings size={16} stroke={1.75} />
                    </button>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item disabled={activateItemDisabled} onClick={() => setConfirmUser(user)}>
                      {user.active ? "Deactivate" : "Activate"}
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              );
            },
          } satisfies TableColumn<UserRow>,
        ]
      : []),
  ];

  return (
    <>
      <ErrorMessage message={error} />
      <Table
        columns={columns}
        rows={result?.users ?? []}
        rowKey={(user) => user.id}
        loading={result === undefined}
        emptyLabel="No users yet."
        search={{ value: search, onChange: handleSearchChange, placeholder: "Search by name or email" }}
        sort={{ activeKey: sortKey, direction: sortDirection, onChange: handleSortChange }}
        pagination={{
          page,
          pageSize,
          total: result?.total ?? 0,
          pageSizeOptions: PAGE_SIZE_OPTIONS,
          onPageChange: setPage,
          onPageSizeChange: (size) => {
            setPageSize(size);
            setPage(1);
          },
        }}
        // The one grayscale-only way to convey active/inactive now (see the
        // settings column's own comment) -- everyone who can see this table
        // sees it, no permission of its own to gate.
        rowClassName={(user) => (user.active ? undefined : styles.inactiveRow)}
      />

      <Modal
        opened={confirmUser !== null}
        onClose={() => setConfirmUser(null)}
        title={confirmUser ? `${confirmUser.active ? "Deactivate" : "Activate"} ${confirmUser.name}?` : ""}
      >
        {confirmUser && (
          <div className={styles.confirmBody}>
            <p className={styles.confirmText}>
              Confirm that you want to {confirmUser.active ? "deactivate" : "activate"} user account for{" "}
              {confirmUser.email}
            </p>
            <div className={styles.confirmActions}>
              <Button onClick={() => void confirmToggleActive()} loading={updatingUserId === confirmUser.id}>
                {confirmUser.active ? "Deactivate" : "Activate"}
              </Button>
              <Button variant="quiet" onClick={() => setConfirmUser(null)} disabled={updatingUserId === confirmUser.id}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
