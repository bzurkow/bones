import { useEffect, useState } from "react";
import { Avatar } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { ROLE_LABELS } from "../AuthHelpers/roles";
import { Table } from "../components";
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

// Real data now -- was a placeholder ("Every account, with role and
// status. Invite, suspend, and role changes will live here."). Read-only
// for this pass; invite/suspend/role-change stay deferred to the
// per-feature permissions work, same as the placeholder's own text
// already said.
export function AdminUsers() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 300);
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  // undefined: still loading the first page. Distinct from "loaded, zero
  // rows" the same way AdminTerms.tsx's `current` does.
  const [result, setResult] = useState<ListUsersResult | undefined>(undefined);

  // A new search term always starts back at page 1 -- staying on, say,
  // page 3 of an old, wider result set would silently show nothing once
  // the narrower search comes back with fewer than 3 pages.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    let cancelled = false;
    void trpc.admin.listUsers
      .query({ page, pageSize, search: debouncedSearch, sortBy: sortKey, sortDirection })
      .then((data) => {
        if (!cancelled) setResult(data);
      });
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, debouncedSearch, sortKey, sortDirection]);

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

  const columns: TableColumn<UserRow>[] = [
    {
      key: "avatar",
      header: "",
      minWidth: 56,
      render: (user) => (
        <Avatar src={user.avatarUrl ?? user.image ?? undefined} alt={user.name} size={32} radius="xl" />
      ),
    },
    { key: "name", header: "Name", enableSort: true, render: (user) => user.name },
    { key: "email", header: "Email", enableSort: true, render: (user) => user.email },
    {
      key: "role",
      header: "Role",
      enableSort: true,
      render: (user) => (
        <span className={styles.status}>
          <span className={styles.statusDot} />
          {ROLE_LABELS[user.role]}
        </span>
      ),
    },
    {
      key: "active",
      header: "Status",
      enableSort: true,
      render: (user) => (
        <span className={styles.status}>
          <span className={`${styles.statusDot} ${user.active ? "" : styles.statusDotInactive}`} />
          {user.active ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Joined",
      enableSort: true,
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
    <Table
      columns={columns}
      rows={result?.users ?? []}
      rowKey={(user) => user.id}
      loading={result === undefined}
      emptyLabel="No users yet."
      search={{ value: search, onChange: setSearch, placeholder: "Search by name or email" }}
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
  );
}
