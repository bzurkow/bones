import { useEffect, useState } from "react";
import { Button, ErrorMessage, Row, RowCard, TextField } from "../components";
import { trpc } from "../trpc";
import styles from "./AdminPanel.module.css";

type Role = Awaited<ReturnType<typeof trpc.roles.list.query>>[number];

// "owner" and "standard" are permanently undeletable server-side
// (roles.ts's delete procedure) -- mirrored here so the delete button
// reads as unavailable rather than present-but-guaranteed-to-fail.
const PROTECTED_ROLES = new Set(["owner", "standard"]);

export function AdminRoles() {
  const [roles, setRoles] = useState<Role[] | undefined>(undefined);
  const [newRoleName, setNewRoleName] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingName, setDeletingName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setRoles(await trpc.roles.list.query());
  }

  useEffect(() => {
    // Same legitimate fetch-on-mount case AdminSiteSettings.tsx's own
    // load() effect documents.
    // oxlint-disable-next-line react/set-state-in-effect
    void load();
  }, []);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setCreating(true);
    try {
      await trpc.roles.create.mutate({ name: newRoleName.trim() });
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
      await trpc.roles.delete.mutate({ name });
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
        Every role a user can have. Grant a new role access to specific features on the Feature Flags &amp;
        Permissions tab -- a role starts with none.
      </p>

      <section>
        <h2 className={styles.sectionTitle}>Roles</h2>

        {roles && (
          <RowCard>
            {roles.map((role) => (
              <Row key={role.name} label={role.name}>
                {PROTECTED_ROLES.has(role.name) ? null : (
                  <Button
                    variant="text"
                    size="sm"
                    disabled={deletingName === role.name}
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
          <Button type="submit" disabled={creating}>
            {creating ? "Creating…" : "Create role"}
          </Button>
        </form>
      </section>
    </div>
  );
}
