import { useCallback, useEffect, useState } from "react";
import { Avatar, Menu } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconChevronDown, IconSettings } from "@tabler/icons-react";
import { useOutletContext } from "react-router-dom";
import { Button, ErrorMessage, Row, RowCard, TextField } from "../components";
import type { TableColumn } from "../components";
import { Table } from "../components";
import { trpc } from "../trpc";
import type { OrganizationOutletContext } from "./OrganizationLayout";
import styles from "./OrganizationMembers.module.css";

type MembersResult = Awaited<ReturnType<typeof trpc.organizations.listMembers.query>>;
type MemberRow = MembersResult["members"][number];
type AddableUser = NonNullable<Awaited<ReturnType<typeof trpc.organizations.findAddableUserByEmail.query>>>;
type OrganizationRole = Awaited<ReturnType<typeof trpc.organizations.roles.list.query>>[number];
type SortKey = "name" | "email" | "role";

const PAGE_SIZE_OPTIONS = [10, 25, 50];

// A loose "does this look finished" check, not real validation (the
// server's own zod .email() is the actual backstop) -- just enough to
// avoid firing a lookup on every keystroke of a still-partial address.
function looksLikeEmail(value: string): boolean {
  const at = value.indexOf("@");
  return at > 0 && value.slice(at + 1).includes(".");
}

// The Members tab -- "all the features of our existing admin users
// table," scoped to this org's own roster. Broken out of the Profile tab
// into its own tab; every member can view it (org/refetchOrg come from
// OrganizationLayout.tsx's Outlet context, view access already
// established there), but Add/Remove/role changes are gated by
// org.canUpdateMembers, its own tab-scoped update permission -- not the
// old blanket canEdit.
export function OrganizationMembers() {
  const { org } = useOutletContext<OrganizationOutletContext>();
  const canEdit = org.canUpdateMembers;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [memberSearch, setMemberSearch] = useState("");
  const [debouncedMemberSearch] = useDebouncedValue(memberSearch, 300);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [membersResult, setMembersResult] = useState<MembersResult | undefined>(undefined);
  const [memberActionUserId, setMemberActionUserId] = useState<string | null>(null);
  const [membersError, setMembersError] = useState<string | null>(null);

  // Organization roles feed the Organization Role cell's dropdown --
  // dynamic (organization-roles.ts), not a hardcoded admin/standard pair,
  // so a custom role (or "viewer") shows up here too.
  const [orgRoles, setOrgRoles] = useState<OrganizationRole[]>([]);

  // Exact email lookup, not a live name/email search -- see
  // trpc/routers/organizations.ts's findAddableUserByEmail for why
  // (a members.update grant is a narrow "manage this org's roster"
  // permission, not "browse the user directory"). undefined: no lookup
  // yet (address isn't finished, or hasn't changed since the last one).
  // null: looked up, no addable user at that address (doesn't exist, or
  // already a member -- this doesn't distinguish the two, same
  // non-enumerable shape as getByName's NOT_FOUND/FORBIDDEN).
  const [addMemberEmail, setAddMemberEmail] = useState("");
  const [debouncedAddMemberEmail] = useDebouncedValue(addMemberEmail, 300);
  const [foundUser, setFoundUser] = useState<AddableUser | null | undefined>(undefined);

  const fetchMembers = useCallback(
    () =>
      trpc.organizations.listMembers.query({
        organizationId: org.id,
        page,
        pageSize,
        search: debouncedMemberSearch,
        sortBy: sortKey,
        sortDirection,
      }),
    [org.id, page, pageSize, debouncedMemberSearch, sortKey, sortDirection],
  );

  useEffect(() => {
    let cancelled = false;
    void fetchMembers()
      .then((data) => {
        if (!cancelled) setMembersResult(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setMembersError(err instanceof Error ? err.message : "Couldn't load members.");
          setMembersResult({ members: [], total: 0, activeAdminCount: 0 });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [fetchMembers]);

  useEffect(() => {
    let cancelled = false;
    // oxlint-disable-next-line react/set-state-in-effect
    void trpc.organizations.roles.list
      .query({ organizationId: org.id })
      .then((result) => {
        if (!cancelled) setOrgRoles(result);
      })
      .catch(() => {
        // Non-fatal -- the role cell just falls back to plain text if
        // this fails; membersError already surfaces the more important
        // roster-load failure.
      });
    return () => {
      cancelled = true;
    };
  }, [org.id]);

  useEffect(() => {
    const email = debouncedAddMemberEmail.trim();
    if (!canEdit || !looksLikeEmail(email)) return;
    let cancelled = false;
    // oxlint-disable-next-line react/set-state-in-effect
    void trpc.organizations.findAddableUserByEmail
      .query({ organizationId: org.id, email })
      .then((result) => {
        if (!cancelled) setFoundUser(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setMembersError(err instanceof Error ? err.message : "Couldn't look up that email.");
      });
    return () => {
      cancelled = true;
    };
  }, [org.id, canEdit, debouncedAddMemberEmail]);

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

  async function handleMemberRoleChange(member: MemberRow, role: string) {
    if (role === member.role) return;
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

  async function handleAddMember() {
    if (!foundUser) return;
    setMembersError(null);
    setMemberActionUserId(foundUser.id);
    try {
      await trpc.organizations.addMember.mutate({ organizationId: org.id, userId: foundUser.id });
      setAddMemberEmail("");
      setFoundUser(undefined);
      setMembersResult(await fetchMembers());
    } catch (err) {
      setMembersError(err instanceof Error ? err.message : "Couldn't add that member.");
    } finally {
      setMemberActionUserId(null);
    }
  }

  // Mirrors the backend's own assertNotLastActiveAdmin (organizations.ts)
  // -- an org can never be left with zero active admins, so the last one
  // can't be demoted or removed. This is a proactive UI guard, not the
  // real enforcement: the server checks (and rejects) this on every
  // write regardless of what the client disables, this just avoids a
  // request that's guaranteed to 400. member.userActive matters because
  // activeAdminCount only counts admins whose own account is active too
  // -- a deactivated user with an unrevoked "admin" org role doesn't
  // count as one of the admins being protected, so it shouldn't read as
  // "the last one" here either.
  function isLastActiveAdmin(member: MemberRow): boolean {
    return member.role === "admin" && member.userActive && (membersResult?.activeAdminCount ?? 0) <= 1;
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
        if (!canEdit) {
          return <span className={styles.mono}>{member.role}</span>;
        }
        return (
          <Menu width={160} position="bottom-start" disabled={memberActionUserId === member.id}>
            <Menu.Target>
              <button type="button" className={styles.cellDropdown}>
                <span className={styles.mono}>{member.role}</span>
                <IconChevronDown size={14} stroke={1.75} />
              </button>
            </Menu.Target>
            <Menu.Dropdown>
              {orgRoles.map((role) => (
                <Menu.Item
                  key={role.name}
                  disabled={role.name === member.role || (role.name !== "admin" && isLastActiveAdmin(member))}
                  onClick={() => void handleMemberRoleChange(member, role.name)}
                >
                  {role.name}
                </Menu.Item>
              ))}
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
                  <Menu.Item
                    disabled={memberActionUserId === member.id || isLastActiveAdmin(member)}
                    onClick={() => void handleRemoveMember(member)}
                  >
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
    <div className={styles.stack}>
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

      {canEdit && (
        <section>
          <h2 className={styles.sectionTitle}>Add a member</h2>
          <TextField
            label="Email"
            name="addMemberEmail"
            type="email"
            placeholder="name@example.com"
            value={addMemberEmail}
            onChange={(event) => {
              setAddMemberEmail(event.currentTarget.value);
              setFoundUser(undefined);
            }}
          />
          {foundUser && (
            <RowCard>
              <Row label={foundUser.name} description={foundUser.email}>
                <Button
                  variant="text"
                  size="sm"
                  disabled={memberActionUserId === foundUser.id}
                  onClick={() => void handleAddMember()}
                >
                  Add
                </Button>
              </Row>
            </RowCard>
          )}
          {foundUser === null && looksLikeEmail(debouncedAddMemberEmail.trim()) && (
            <p className={styles.mono}>No addable user found with that email.</p>
          )}
        </section>
      )}
    </div>
  );
}
