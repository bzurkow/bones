import { useCallback, useEffect, useState } from "react";
import { Avatar, Menu } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconChevronDown } from "@tabler/icons-react";
import type { UserRole } from "backend";
import { authClient } from "../AuthHelpers/auth-client";
import { ROLE_LABELS } from "../AuthHelpers/roles";
import { ErrorMessage, Table } from "../components";
import type { TableColumn } from "../components";
import { trpc } from "../trpc";
import styles from "./AdminUsers.module.css";

type ListUsersResult = Awaited<ReturnType<typeof trpc.admin.listUsers.query>>;
type UserRow = ListUsersResult["users"][number];
// Matches admin.ts's own SORTABLE_COLUMNS keys -- kept as a plain local
// union rather than derived from the router's input type, since this file
// already owns the column definitions those keys come from anyway.
type SortKey = "name" | "email" | "role" | "active" | "createdAt";

const PAGE_SIZE_OPTIONS = [10, 25, 50];
// Object.keys preserves insertion order for string keys (none of these are
// integer-like), so this always renders owner/administrator/standard/demo
// in the same order ROLE_LABELS defines them -- no separate literal list
// to keep in sync. ROLE_LABELS' keys are UserRole by construction; the cast
// just tells TS that, since Object.keys itself only ever returns string[].
const ROLE_OPTIONS = Object.keys(ROLE_LABELS) as UserRole[];

// Role/status are now live editable dropdowns (setUserRole/setUserActive
// below) -- everything else (name, email, joined) stays read-only,
// deferred to the per-feature permissions work same as the rest of the
// admin area.
//
// TODO(permissions): the "can't target your own row" guard here is just
// admin.ts's own ad hoc check (self-lockout prevention), not a real
// permissions model -- revisit once bones-roadmap-notes.md item 3's actual
// RBAC approach is settled, so this doesn't end up a second, inconsistent
// place role/permission rules live.
export function AdminUsers() {
  const { data: session } = authClient.useSession();
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
    void fetchUsers().then((data) => {
      if (!cancelled) setResult(data);
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
      key: "role",
      header: "Role",
      enableSort: true,
      // Fits "Administrator" (the longest ROLE_LABELS value) plus the
      // dropdown chevron, in the mono font its cell actually renders in.
      width: 170,
      render: (user) => {
        // admin.ts rejects a caller targeting their own row (self-lockout
        // guard) -- so your own row just shows the plain value instead of
        // a dropdown that would only ever fail when used.
        if (user.id === session?.user.id) {
          return <span className={styles.mono}>{ROLE_LABELS[user.role]}</span>;
        }
        return (
          <Menu width={190} position="bottom-start" disabled={updatingUserId === user.id}>
            <Menu.Target>
              <button type="button" className={styles.cellDropdown}>
                <span className={styles.mono}>{ROLE_LABELS[user.role]}</span>
                <IconChevronDown size={14} stroke={1.75} />
              </button>
            </Menu.Target>
            <Menu.Dropdown>
              {ROLE_OPTIONS.map((role) => (
                <Menu.Item key={role} disabled={role === user.role} onClick={() => void handleRoleChange(user, role)}>
                  {ROLE_LABELS[role]}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
        );
      },
    },
    {
      key: "active",
      header: "Status",
      enableSort: true,
      // Fits "INACTIVE" (the longer of the two, uppercased via
      // styles.status) plus the dot and dropdown chevron.
      width: 150,
      render: (user) => {
        const label = (
          <span className={styles.status}>
            <span
              className={`${styles.statusDot} ${user.active ? styles.statusDotActive : styles.statusDotInactive}`}
            />
            {user.active ? "Active" : "Inactive"}
          </span>
        );
        if (user.id === session?.user.id) return label;
        return (
          <Menu width={150} position="bottom-start" disabled={updatingUserId === user.id}>
            <Menu.Target>
              <button type="button" className={styles.cellDropdown}>
                {label}
                <IconChevronDown size={14} stroke={1.75} />
              </button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item disabled={user.active} onClick={() => void handleActiveChange(user, true)}>
                <span className={styles.status}>
                  <span className={`${styles.statusDot} ${styles.statusDotActive}`} />
                  Active
                </span>
              </Menu.Item>
              <Menu.Item disabled={!user.active} onClick={() => void handleActiveChange(user, false)}>
                <span className={styles.status}>
                  <span className={`${styles.statusDot} ${styles.statusDotInactive}`} />
                  Inactive
                </span>
              </Menu.Item>
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
      />
    </>
  );
}
