import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Button, ErrorMessage, Row, RowCard, TextField } from "../components";
import { trpc } from "../trpc";
import type { OrganizationOutletContext } from "./OrganizationLayout";
import styles from "./OrganizationRoles.module.css";

type OrganizationRole = Awaited<ReturnType<typeof trpc.organizations.roles.list.query>>[number];

// "admin"/"standard"/"viewer" are permanently undeletable server-side
// (organization-roles.ts's delete procedure) -- mirrored here so the
// delete button reads as unavailable rather than present-but-guaranteed-
// to-fail. Same set organization-roles-schema.ts itself protects.
const PROTECTED_ORGANIZATION_ROLES = new Set(["admin", "standard", "viewer"]);

// Mirrors Admin/AdminRoles.tsx, scoped to one organization. Every member
// can view this tab; org.canUpdateRoles (its own tab-scoped update
// permission, or the global admin.organizations.update override) gates
// Create/Delete specifically.
export function OrganizationRoles() {
  const { org } = useOutletContext<OrganizationOutletContext>();
  const canEdit = org.canUpdateRoles;

  const [roles, setRoles] = useState<OrganizationRole[] | undefined>(undefined);
  const [newRoleName, setNewRoleName] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingName, setDeletingName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async () => setRoles(await trpc.organizations.roles.list.query({ organizationId: org.id })),
    [org.id],
  );

  useEffect(() => {
    let cancelled = false;
    // oxlint-disable-next-line react/set-state-in-effect
    void load().catch((err: unknown) => {
      if (!cancelled) setError(err instanceof Error ? err.message : "Couldn't load roles.");
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setCreating(true);
    try {
      await trpc.organizations.roles.create.mutate({ organizationId: org.id, name: newRoleName.trim() });
      setNewRoleName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create that role.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(name: string) {
    setError(null);
    setDeletingName(name);
    try {
      await trpc.organizations.roles.delete.mutate({ organizationId: org.id, name });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete that role.");
    } finally {
      setDeletingName(null);
    }
  }

  return (
    <div className={styles.stack}>
      <p className={styles.body}>
        Every role a member of this organization can have. Grant a new role access to specific features on the
        Permissions tab -- a role starts with none.
      </p>

      <section>
        <h2 className={styles.sectionTitle}>Roles</h2>

        {roles && (
          <RowCard>
            {roles.map((role) => (
              <Row key={role.name} label={role.name}>
                {PROTECTED_ORGANIZATION_ROLES.has(role.name) ? null : (
                  <Button
                    variant="text"
                    size="sm"
                    disabled={!canEdit || deletingName === role.name}
                    onClick={() => void handleDelete(role.name)}
                  >
                    Delete
                  </Button>
                )}
              </Row>
            ))}
          </RowCard>
        )}

        <ErrorMessage message={error} />
      </section>

      <section>
        <h2 className={styles.sectionTitle}>Create a role</h2>
        <form className={styles.createForm} onSubmit={(event) => void handleCreate(event)}>
          <TextField
            label="Name"
            name="name"
            required
            value={newRoleName}
            onChange={(event) => setNewRoleName(event.currentTarget.value)}
          />
          <Button type="submit" disabled={!canEdit || creating}>
            {creating ? "Creating…" : "Create role"}
          </Button>
        </form>
      </section>
    </div>
  );
}
