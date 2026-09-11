import { useEffect, useState } from "react";
import { TextInput } from "@mantine/core";
import { hasFeature } from "../AuthHelpers/permissions";
import { Button, ErrorMessage, MarkdownEditor, MarkdownViewer } from "../components";
import { useEffectivePermissions } from "../hooks/useEffectivePermissions";
import { trpc } from "../trpc";
import styles from "./AdminPanel.module.css";
import termsStyles from "./AdminTerms.module.css";

// Only the fields this page actually reads -- termsAndConditions.get's full
// return type includes createdAt typed as Date, which is only true
// server-side; there's no superjson transformer configured on the tRPC
// client (trpc.ts), so it's really a string once it's crossed the wire as
// plain JSON. Narrowing to just what's used here sidesteps that mismatch
// entirely rather than fighting it.
interface TermsAndConditions {
  termsAndConditionsAttribution: string;
  content: string;
}

// view: the current version's field values, read-only. edit: the same two
// fields as a form (attribution + markdown), pre-filled from the current
// version if one exists.
type Mode = "view" | "edit";

export function AdminTerms() {
  const { features: effectiveFeatures } = useEffectivePermissions();
  const canUpdate = hasFeature(effectiveFeatures, "admin.terms.update");
  const [current, setCurrent] = useState<TermsAndConditions | null | undefined>(undefined);
  const [mode, setMode] = useState<Mode>("view");
  const [attribution, setAttribution] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setCurrent(await trpc.termsAndConditions.get.query());
  }

  useEffect(() => {
    // oxlint flags setCurrent (inside load()) as "setState in an effect" --
    // this is the legitimate case that guidance carves out, not the
    // anti-pattern it's meant to catch: a one-time fetch-on-mount with no
    // value to derive from render and no prior event to hang it off of,
    // the canonical "synchronize with an external system" use of
    // useEffect (react.dev/learn/synchronizing-with-effects#fetching-data).
    // oxlint-disable-next-line react/set-state-in-effect
    void load();
  }, []);

  function startEdit() {
    setAttribution(current?.termsAndConditionsAttribution ?? "");
    setContent(current?.content ?? "");
    setError(null);
    setMode("edit");
  }

  function cancelEdit() {
    setError(null);
    setMode("view");
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await trpc.termsAndConditions.update.mutate({ content, attribution });
      await load();
      setMode("view");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that change.");
    } finally {
      setSaving(false);
    }
  }

  // Loading (undefined) vs. "no version posted yet" (null) -- distinct
  // states, same as termsAndConditions.get's own null-vs-not-yet-fetched
  // distinction on the backend.
  if (current === undefined) return null;

  if (mode === "edit") {
    return (
      <div className={termsStyles.form}>
        <TextInput
          label="Terms and conditions attribution"
          value={attribution}
          onChange={(event) => setAttribution(event.currentTarget.value)}
        />
        <MarkdownEditor label="Content" value={content} onChange={setContent} />
        <div className={termsStyles.actions}>
          <Button onClick={() => void save()} loading={saving}>
            Save
          </Button>
          <Button variant="quiet" onClick={cancelEdit} disabled={saving}>
            Cancel
          </Button>
        </div>
        <ErrorMessage message={error} />
      </div>
    );
  }

  return (
    <div className={termsStyles.form}>
      {current === null ? (
        <p className={styles.body}>No terms and conditions have been posted yet.</p>
      ) : (
        <>
          <div className={termsStyles.field}>
            <span className={termsStyles.fieldLabel}>Attribution</span>
            <p className={termsStyles.fieldValue}>{current.termsAndConditionsAttribution}</p>
          </div>
          <MarkdownViewer content={current.content} />
        </>
      )}
      {canUpdate && (
        <div className={termsStyles.actions}>
          <Button onClick={startEdit}>{current === null ? "Create" : "Edit"}</Button>
        </div>
      )}
    </div>
  );
}
